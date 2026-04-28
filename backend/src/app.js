// Express app factory. server.js wires this to a port; tests can import it directly.

const path = require('path');
const express = require('express');
const cors = require('cors');

const config = require('./config');
const logger = require('./utils/logger');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

config.assertReady();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Lightweight request logger — keeps stdout useful without pulling morgan in.
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
});

// Health check for load balancers / k8s probes.
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use('/api', routes);

// Static frontend — same origin, no CORS dance.
// Serves the React+Tailwind build from `frontend/dist`. Run `npm run build`
// in `frontend/` first; in development use Vite's dev server (port 5173) which
// proxies `/api` calls back here.
const frontendDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
// SPA fallback so React Router-style deep links work if added later.
app.get(/^\/(?!api|health).*/, (_req, res, next) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next();
  });
});

// Centralised error handler — must come after routes.
app.use(errorHandler);

module.exports = app;
