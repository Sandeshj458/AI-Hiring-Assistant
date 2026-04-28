// Email generation endpoint. Returns a draft (subject + body) — sending is
// out of scope for the assistant; the ATS owns delivery.

const { asyncHandler, AppError } = require('../utils/errors');
const emailService = require('../services/emailService');
const mailerService = require('../services/mailerService');

exports.generate = asyncHandler(async (req, res) => {
  const { candidateId, kind, jobTitle = 'the role', company = 'our team', customTemplate } = req.body || {};
  if (!candidateId) throw new AppError('candidateId is required', 400, 'MISSING_CANDIDATE');
  if (!['invite', 'rejection'].includes(kind)) {
    throw new AppError('kind must be "invite" or "rejection"', 400, 'INVALID_KIND');
  }
  const draft = await emailService.generateEmail({
    candidateId,
    kind,
    jobTitle,
    company,
    customTemplate,
  });
  res.json(draft);
});

exports.send = asyncHandler(async (req, res) => {
  const { to, subject, body, candidateId, kind } = req.body || {};
  const result = await mailerService.sendEmail({ to, subject, body });

  // If the caller passed a candidate ref, record the send on the candidate so
  // the dashboard can show "Invited @ time" / "Rejected @ time" badges.
  if (candidateId && kind) {
    try {
      await emailService.recordEmailSent({
        candidateId,
        kind,
        to,
        subject,
        messageId: result.messageId,
      });
    } catch (err) {
      // Don't fail the response — the email *was* sent, recording is best-effort.
      // Surface the issue in logs only.
      // eslint-disable-next-line no-console
      console.warn(`recordEmailSent failed for ${candidateId}: ${err.message}`);
    }
  }
  res.json({ ok: true, ...result });
});
