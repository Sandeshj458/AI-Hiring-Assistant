// Email generation service. Returns a draft { subject, body } the recruiter
// can review and send via the existing ATS mailer.

const llm = require('./llmService');
const emailPrompt = require('../prompts/emailPrompt');
const resumeService = require('./resumeService');
const { extractJson } = require('../utils/pdfParser');
const { AppError } = require('../utils/errors');

async function generateEmail({ candidateId, kind, jobTitle, company, customTemplate }) {
  const candidate = await resumeService.loadCandidate(candidateId);
  if (!candidate.parsed) {
    throw new AppError('Candidate has not been parsed yet', 400, 'NOT_PARSED');
  }

  const raw = await llm.complete({
    system: emailPrompt.SYSTEM,
    user: emailPrompt.userPrompt(kind, {
      candidate: candidate.parsed,
      jobTitle,
      company,
      customTemplate,
    }),
    maxTokens: 800,
    label: `email-${kind}`,
  });
  const draft = extractJson(raw);

  if (!draft.subject || !draft.body) {
    throw new AppError('LLM returned malformed email', 502, 'LLM_BAD_EMAIL', { raw });
  }
  return {
    candidateId,
    kind,
    to: candidate.parsed.email || null,
    subject: draft.subject,
    body: draft.body,
  };
}

// Append a sent-email record to the candidate's history. Idempotent on
// messageId to defend against double-clicks. Used by the mail controller
// and the auto-send path in batch-process.
async function recordEmailSent({ candidateId, kind, to, subject, messageId }) {
  const candidate = await resumeService.loadCandidate(candidateId);
  candidate.emailHistory = candidate.emailHistory || [];
  if (messageId && candidate.emailHistory.some((e) => e.messageId === messageId)) {
    return candidate.emailHistory;
  }
  candidate.emailHistory.push({
    kind,
    to,
    subject,
    messageId,
    sentAt: new Date().toISOString(),
  });
  await resumeService.saveCandidate(candidate);
  return candidate.emailHistory;
}

module.exports = { generateEmail, recordEmailSent };
