// SMTP transport. Configured once from env, reused per request.
//
// Required env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
// Gmail example: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USER=<addr>,
// SMTP_PASS=<16-char app password>, SMTP_FROM=<addr>.

const nodemailer = require('nodemailer');

const config = require('../config');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

let _transport;

const getTransport = () => {
  const { host, port, secure, user, pass } = config.smtp;
  if (!host || !user || !pass) {
    throw new AppError(
      'SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in backend/.env.',
      503,
      'SMTP_NOT_CONFIGURED'
    );
  }
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }
  return _transport;
};

async function sendEmail({ to, subject, body }) {
  if (!to || !subject || !body) {
    throw new AppError('to, subject, and body are required', 400, 'MISSING_FIELDS');
  }
  const info = await getTransport().sendMail({
    from: config.smtp.from,
    to,
    subject,
    text: body,
  });
  logger.info(`mail sent: ${info.messageId} → ${to}`);
  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

module.exports = { sendEmail };
