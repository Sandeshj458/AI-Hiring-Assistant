// Resume domain logic — upload, parse with the LLM, persist parsed JSON.
//
// Storage layout (S3 bucket OR local ./storage dir, depending on backend):
//   resumes/<candidateId>.<ext>      raw resume file
//   metadata/<candidateId>.json      { candidateId, resume, parsed?, score?, ... }
//
// We treat the metadata file as the candidate's record. Every other service
// reads/writes through `loadCandidate` / `saveCandidate` so the shape stays
// consistent across backends.

const { v4: uuid } = require('uuid');

const config = require('../config');
const storage = require('./storageService');
const llm = require('./llmService');
const parsePrompt = require('../prompts/parsePrompt');
const { extractText, extractJson } = require('../utils/pdfParser');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

const metadataKey = (candidateId) => `${config.storage.metadataPrefix}${candidateId}.json`;

async function loadCandidate(candidateId) {
  return storage.getJson(metadataKey(candidateId));
}

async function saveCandidate(candidate) {
  await storage.putJson(metadataKey(candidate.candidateId), candidate);
  return candidate;
}

async function uploadResume(file) {
  const candidateId = uuid();
  const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase();
  const resumeKey = `${config.storage.resumePrefix}${candidateId}.${ext}`;

  await storage.putObject({
    key: resumeKey,
    body: file.buffer,
    contentType: file.mimetype || 'application/octet-stream',
  });

  const candidate = {
    candidateId,
    resume: {
      key: resumeKey,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    },
    parsed: null,
    score: null,
    shortlisted: false,
  };
  await saveCandidate(candidate);
  logger.info(`resume uploaded: ${candidateId} (${file.originalname})`);
  return { candidateId, resumeKey, filename: file.originalname };
}

async function parseResume({ candidateId, resumeKey }) {
  // We accept either a candidateId (preferred) or a raw resumeKey for ad-hoc parsing.
  let candidate;
  if (candidateId) {
    candidate = await loadCandidate(candidateId);
  } else {
    // Parse-only mode (no candidate record). Useful for one-off testing.
    const buf = await storage.getObjectBuffer(resumeKey);
    const text = await extractText(buf, resumeKey);
    return runParse(text);
  }

  if (!candidate?.resume?.key) {
    throw new AppError(`Candidate ${candidateId} has no resume`, 404, 'NO_RESUME');
  }

  const buf = await storage.getObjectBuffer(candidate.resume.key);
  const text = await extractText(buf, candidate.resume.filename);
  const parsed = await runParse(text);

  candidate.parsed = parsed;
  candidate.parsedAt = new Date().toISOString();
  await saveCandidate(candidate);
  return parsed;
}

async function runParse(resumeText) {
  const raw = await llm.complete({
    system: parsePrompt.SYSTEM,
    user: parsePrompt.userPrompt(resumeText),
    maxTokens: 1500,
    label: 'parse-resume',
  });
  return extractJson(raw);
}

module.exports = {
  uploadResume,
  parseResume,
  loadCandidate,
  saveCandidate,
};
