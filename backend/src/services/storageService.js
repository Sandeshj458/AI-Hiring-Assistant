// Unified storage facade. Picks `local` (filesystem) or `s3` based on config.
// All other services import this — never the concrete backends — so the choice
// is transparent.

const config = require('../config');
const logger = require('../utils/logger');

const backend =
  config.storage.backend === 's3'
    ? require('./s3Service')
    : require('./localStorageService');

logger.info(
  `storage backend: ${config.storage.backend}` +
    (config.storage.backend === 'local' ? ` (${config.storage.localDir})` : '')
);

module.exports = backend;
