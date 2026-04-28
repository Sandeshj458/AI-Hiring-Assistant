// Domain error class. Lets controllers throw with a status code and have the
// error middleware do the translation to JSON automatically.

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR', details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Helper to wrap async route handlers so we don't have to `try/catch` everywhere.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { AppError, asyncHandler };
