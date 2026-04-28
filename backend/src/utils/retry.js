// Exponential-backoff retry. Used by the LLM layer because rate limits and
// transient 5xx responses are common in production.
//
// If the thrown error sets `retryAfterMs`, we honour that instead of our own
// backoff schedule (provider knows better than we do).
// If the error sets `noRetry: true` (e.g. daily-quota exhausted), we surface
// it immediately — retrying would just waste time and burn more quota.

const logger = require('./logger');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function retry(fn, { retries = 3, baseDelay = 500, label = 'op' } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;

      if (err.noRetry) {
        logger.warn(`${label}: not retrying (${err.code || err.message})`);
        throw err;
      }

      if (attempt > retries) {
        logger.warn(`${label}: giving up after ${retries} retries — ${err.message}`);
        throw err;
      }

      const delay = err.retryAfterMs || baseDelay * 2 ** (attempt - 1);
      logger.warn(
        `${label}: attempt ${attempt} failed (${err.message?.slice(0, 120)}), retrying in ${delay}ms`
      );
      await sleep(delay);
    }
  }
}

module.exports = { retry };
