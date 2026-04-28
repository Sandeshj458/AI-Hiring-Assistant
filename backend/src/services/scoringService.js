// Scoring service. Given a parsed candidate + a job description, asks the LLM
// to produce a structured score.

const llm = require('./llmService');
const scorePrompt = require('../prompts/scorePrompt');
const resumeService = require('./resumeService');
const { extractJson } = require('../utils/pdfParser');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

async function scoreCandidate({ candidateId, jobDescription, jobTitle }) {
  const candidate = await resumeService.loadCandidate(candidateId);
  if (!candidate.parsed) {
    // Auto-parse if not already done — saves the caller a round-trip.
    candidate.parsed = await resumeService.parseResume({ candidateId });
  }

  const raw = await llm.complete({
    system: scorePrompt.SYSTEM,
    user: scorePrompt.userPrompt(jobDescription, candidate.parsed),
    maxTokens: 1200,
    label: 'score-candidate',
  });
  const result = extractJson(raw);

  // Some models return "82" instead of 82. Coerce, then validate.
  const numericScore = Number(result.score);
  if (!Number.isFinite(numericScore)) {
    throw new AppError('LLM returned no numeric score', 502, 'LLM_BAD_SCORE', {
      raw: typeof raw === 'string' ? raw.slice(0, 500) : raw,
    });
  }
  result.score = Math.max(0, Math.min(100, Math.round(numericScore)));

  candidate.score = result;
  candidate.jobTitle = jobTitle;
  candidate.jobDescription = jobDescription;
  candidate.scoredAt = new Date().toISOString();
  await resumeService.saveCandidate(candidate);
  logger.info(`scored ${candidateId}: ${result.score}`);
  return result;
}

module.exports = { scoreCandidate };
