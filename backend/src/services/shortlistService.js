// Shortlist storage. The shortlist lives as a single JSON file in S3 — small,
// easy to inspect, easy to back up. Concurrent writers could race, but the
// hiring-assistant workload is low-write so the simplicity wins.

const config = require('../config');
const storage = require('./storageService');
const resumeService = require('./resumeService');
const logger = require('../utils/logger');

const SHORTLIST_KEY = config.storage.shortlistKey;

async function loadShortlist() {
  return storage.getJson(SHORTLIST_KEY, { fallback: { items: [] } });
}

async function saveShortlist(shortlist) {
  await storage.putJson(SHORTLIST_KEY, shortlist);
}

// Decide whether to add this candidate to the shortlist, based on the threshold.
// Idempotent — re-scoring the same candidate updates their entry in place.
async function maybeShortlist(candidateId, scoreResult, jobTitle) {
  const above = scoreResult.score >= config.hiring.shortlistThreshold;
  const shortlist = await loadShortlist();

  const existingIdx = shortlist.items.findIndex((i) => i.candidateId === candidateId);

  if (!above) {
    // If they previously qualified and now don't, drop them.
    if (existingIdx !== -1) {
      shortlist.items.splice(existingIdx, 1);
      await saveShortlist(shortlist);
    }
    // Mark candidate record as not shortlisted.
    const candidate = await resumeService.loadCandidate(candidateId);
    candidate.shortlisted = false;
    await resumeService.saveCandidate(candidate);
    return { shortlisted: false };
  }

  const candidate = await resumeService.loadCandidate(candidateId);
  const entry = {
    candidateId,
    name: candidate.parsed?.name || null,
    email: candidate.parsed?.email || null,
    phone: candidate.parsed?.phone || null,
    score: scoreResult.score,
    jobTitle: jobTitle || candidate.jobTitle || null,
    shortlistedAt: new Date().toISOString(),
  };
  if (existingIdx === -1) shortlist.items.push(entry);
  else shortlist.items[existingIdx] = entry;

  // Keep the file sorted desc by score so the dashboard reads it in ranking order.
  shortlist.items.sort((a, b) => b.score - a.score);
  await saveShortlist(shortlist);

  candidate.shortlisted = true;
  await resumeService.saveCandidate(candidate);
  logger.info(`shortlisted ${candidateId} (${entry.score})`);
  return { shortlisted: true };
}

async function getShortlisted() {
  const shortlist = await loadShortlist();
  return shortlist.items;
}

// Bonus — full ranked list of every candidate we have a score for.
async function getAllScored() {
  const keys = await storage.listKeys(config.storage.metadataPrefix);
  const candidates = [];
  for (const key of keys) {
    try {
      const c = await storage.getJson(key);
      if (c.score) {
        candidates.push({
          candidateId: c.candidateId,
          name: c.parsed?.name || null,
          email: c.parsed?.email || null,
          score: c.score.score,
          shortlisted: !!c.shortlisted,
          jobTitle: c.jobTitle || null,
          scoredAt: c.scoredAt,
          emailHistory: c.emailHistory || [],
        });
      }
    } catch (err) {
      logger.warn(`skipping candidate at ${key}: ${err.message}`);
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

module.exports = { maybeShortlist, getShortlisted, getAllScored };
