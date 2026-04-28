// Entry point. Boots the Express app and listens on the configured port.
require('dotenv').config();

const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');

const server = app.listen(config.port, () => {
  logger.info(`AI Hiring Assistant listening on port ${config.port}`);
  logger.info(`LLM provider: ${config.llm.provider}`);
});

// Graceful shutdown — flush in-flight requests before exiting.
const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
