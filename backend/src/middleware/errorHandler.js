// Express error middleware. Translates thrown errors into a consistent JSON
// envelope. In development we surface the real message and stack so the
// client (browser devtools, curl) can see what actually broke.

const multer = require('multer');

const config = require('../config');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

// Multer's file-size / file-count limits throw `MulterError`. These are user
// problems, not server bugs — translate to 400 instead of leaking 500.
const MULTER_TO_HTTP = {
  LIMIT_FILE_SIZE: { status: 413, code: 'FILE_TOO_LARGE' },
  LIMIT_FILE_COUNT: { status: 400, code: 'TOO_MANY_FILES' },
  LIMIT_UNEXPECTED_FILE: { status: 400, code: 'UNEXPECTED_FIELD' },
  LIMIT_PART_COUNT: { status: 400, code: 'TOO_MANY_PARTS' },
};

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    logger.warn(`${req.method} ${req.originalUrl} → ${err.statusCode} ${err.message}`);
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
  }

  if (err instanceof multer.MulterError) {
    const mapped = MULTER_TO_HTTP[err.code] || { status: 400, code: err.code };
    logger.warn(`${req.method} ${req.originalUrl} → ${mapped.status} ${err.message}`);
    return res.status(mapped.status).json({ error: err.message, code: mapped.code });
  }

  // Unknown error — log everything we have, surface details only in dev.
  logger.error(
    `Unhandled error on ${req.method} ${req.originalUrl}: ${err.stack || err.message || err}`
  );

  const payload = { error: 'Internal server error', code: 'INTERNAL_ERROR' };
  if (config.env !== 'production') {
    // Make the actual reason visible to the developer instead of a generic 500.
    payload.error = err.message || String(err);
    payload.code = err.code || 'INTERNAL_ERROR';
    if (err.stack) payload.stack = err.stack.split('\n').slice(0, 5);
  }
  return res.status(500).json(payload);
};
