// Tiny leveled logger — avoids pulling in winston/pino for a system this size.
// Levels: error < warn < info < debug. Anything below the configured level is dropped.

const config = require('../config');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const threshold = LEVELS[config.logLevel] ?? LEVELS.info;

const fmt = (level, msg) => {
  const ts = new Date().toISOString();
  return `[${ts}] ${level.toUpperCase()} ${msg}`;
};

const make = (level) => (msg) => {
  if (LEVELS[level] > threshold) return;
  // eslint-disable-next-line no-console
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  out(fmt(level, msg));
};

module.exports = {
  error: make('error'),
  warn: make('warn'),
  info: make('info'),
  debug: make('debug'),
};
