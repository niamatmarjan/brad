import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './db.mjs';
import { authMiddleware } from './auth.mjs';
import { createApiRouter } from './api.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createApp(db = getDb()) {
  const app = express();

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-role']
  }));

  app.use(express.json());
  app.use(authMiddleware(db));

  app.get('/health', (req, res) => {
    res.json({ ok: true, status: 'healthy', version: '0.5.0', timestamp: new Date().toISOString() });
  });

  app.use('/api', createApiRouter(db));

  // Serve static UI if built
  const webDist = join(__dirname, '../../web/dist');
  if (existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path === '/health') return next();
      res.sendFile(join(webDist, 'index.html'));
    });
  }

  return app;
}

const PORT = process.env.PORT || 4173;

if (process.argv[1] && process.argv[1].endsWith('server.mjs')) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`RelayDesk API Server listening on http://localhost:${PORT}`);
  });
}
