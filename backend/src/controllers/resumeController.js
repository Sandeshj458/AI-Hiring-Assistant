// Resume endpoints — upload, parse, batch-process.
// Controllers stay thin: validate input, delegate to services, shape response.

const { asyncHandler, AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const resumeService = require('../services/resumeService');
const scoringService = require('../services/scoringService');
const shortlistService = require('../services/shortlistService');
const emailService = require('../services/emailService');
const mailerService = require('../services/mailerService');

exports.upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded (field name: "resume")', 400, 'NO_FILE');
  const result = await resumeService.uploadResume(req.file);
  res.status(201).json(result);
});

exports.parse = asyncHandler(async (req, res) => {
  const { candidateId, resumeKey } = req.body || {};
  if (!candidateId && !resumeKey) {
    throw new AppError('candidateId or resumeKey required', 400, 'MISSING_INPUT');
  }
  const parsed = await resumeService.parseResume({ candidateId, resumeKey });
  res.json(parsed);
});

// Bonus — batch parse + score in a single call so recruiters can drop a folder
// of resumes against one JD and walk away.
//
// Each file is processed inside its own try/catch so one bad PDF never tanks
// the whole request — the response always carries a per-file outcome.
exports.batchProcess = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw new AppError('No files uploaded (field name: "resumes")', 400, 'NO_FILES');

  const { jobDescription, jobTitle = 'Open role', company = 'our team' } = req.body || {};
  if (!jobDescription) throw new AppError('jobDescription is required', 400, 'MISSING_JD');

  // Multipart form values are always strings — coerce explicitly.
  const autoSend = ['true', '1', 'on', 'yes'].includes(String(req.body?.autoSend || '').toLowerCase());

  logger.info(
    `batch-process: ${files.length} file(s) for "${jobTitle}" (autoSend=${autoSend})`
  );

  const results = [];
  for (const file of files) {
    const label = `batch[${file.originalname}]`;
    let candidateId;
    try {
      logger.debug(`${label}: uploading`);
      const uploaded = await resumeService.uploadResume(file);
      candidateId = uploaded.candidateId;

      logger.debug(`${label}: parsing`);
      const parsed = await resumeService.parseResume({ candidateId });

      logger.debug(`${label}: scoring`);
      const scored = await scoringService.scoreCandidate({
        candidateId,
        jobDescription,
        jobTitle,
      });

      logger.debug(`${label}: shortlisting`);
      const shortlistResult = await shortlistService.maybeShortlist(candidateId, scored, jobTitle);

      // Auto-send: invite if shortlisted, rejection otherwise. Failures here
      // are non-fatal — the candidate is still parsed/scored/saved.
      let emailOutcome = null;
      if (autoSend) {
        const kind = shortlistResult.shortlisted ? 'invite' : 'rejection';
        emailOutcome = await sendAutoEmail({ candidateId, kind, jobTitle, company, label });
      }

      results.push({
        candidateId,
        filename: file.originalname,
        parsed,
        scored,
        shortlisted: shortlistResult.shortlisted,
        email: emailOutcome,
      });
    } catch (err) {
      logger.warn(`${label}: failed at step → ${err.code || 'ERR'}: ${err.message}`);
      results.push({
        candidateId,
        filename: file.originalname,
        error: err.message || 'Unknown error',
        code: err.code || 'PROCESSING_FAILED',
      });
    }
  }

  res.json({ processed: results.length, autoSend, results });
});

// Generate + send + record. Returns a small status object the controller
// embeds in the per-file result. Never throws — auto-send is best-effort.
async function sendAutoEmail({ candidateId, kind, jobTitle, company, label }) {
  try {
    logger.debug(`${label}: drafting ${kind} email`);
    const draft = await emailService.generateEmail({ candidateId, kind, jobTitle, company });
    if (!draft.to) {
      return { kind, status: 'skipped', reason: 'no email address on resume' };
    }
    logger.debug(`${label}: sending ${kind} to ${draft.to}`);
    const sendRes = await mailerService.sendEmail({
      to: draft.to,
      subject: draft.subject,
      body: draft.body,
    });
    await emailService.recordEmailSent({
      candidateId,
      kind,
      to: draft.to,
      subject: draft.subject,
      messageId: sendRes.messageId,
    });
    return { kind, status: 'sent', to: draft.to, messageId: sendRes.messageId };
  } catch (err) {
    logger.warn(`${label}: ${kind} send failed — ${err.message}`);
    return { kind, status: 'failed', error: err.message, code: err.code || 'SEND_FAILED' };
  }
}
