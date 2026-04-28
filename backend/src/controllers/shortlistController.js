// Shortlist + ranking + export endpoints.

const { asyncHandler } = require('../utils/errors');
const shortlistService = require('../services/shortlistService');

exports.list = asyncHandler(async (_req, res) => {
  const items = await shortlistService.getShortlisted();
  res.json({ count: items.length, items });
});

// Bonus — full ranked dashboard view (everything we've scored, not just shortlisted).
exports.allRanked = asyncHandler(async (_req, res) => {
  const items = await shortlistService.getAllScored();
  res.json({ count: items.length, items });
});

// Bonus — CSV export of the current shortlist.
exports.exportCsv = asyncHandler(async (_req, res) => {
  const items = await shortlistService.getShortlisted();
  const header = 'candidateId,name,email,phone,score,jobTitle,shortlistedAt';
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const rows = items.map((c) =>
    [c.candidateId, c.name, c.email, c.phone, c.score, c.jobTitle, c.shortlistedAt]
      .map(escape)
      .join(',')
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="shortlist.csv"');
  res.send([header, ...rows].join('\n'));
});
