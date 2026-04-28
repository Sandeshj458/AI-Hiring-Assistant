// Score a parsed candidate against a job description.

const { asyncHandler, AppError } = require('../utils/errors');
const scoringService = require('../services/scoringService');
const shortlistService = require('../services/shortlistService');

exports.score = asyncHandler(async (req, res) => {
  const { candidateId, jobDescription, jobTitle = 'Open role' } = req.body || {};
  if (!candidateId) throw new AppError('candidateId is required', 400, 'MISSING_CANDIDATE');
  if (!jobDescription) throw new AppError('jobDescription is required', 400, 'MISSING_JD');

  const scored = await scoringService.scoreCandidate({ candidateId, jobDescription, jobTitle });
  const shortlistResult = await shortlistService.maybeShortlist(candidateId, scored, jobTitle);

  res.json({ ...scored, shortlisted: shortlistResult.shortlisted });
});
