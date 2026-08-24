import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();
const VERSION = '1.0.0';

function databaseStatus() {
  try {
    getDb().prepare('SELECT 1').get();
    return 'connected';
  } catch {
    return 'disconnected';
  }
}

router.get('/health', (_req, res) => {
  const database = databaseStatus();
  res.status(database === 'connected' ? 200 : 503).json({
    status: database === 'connected' ? 'ok' : 'degraded',
    database,
    timestamp: new Date().toISOString(),
    version: VERSION,
  });
});

// Liveness: the process is running at all.
router.get('/live', (_req, res) => res.json({ status: 'alive' }));

// Readiness: dependencies are usable, so traffic can be routed here.
router.get('/ready', (_req, res) => {
  const database = databaseStatus();
  const ready = database === 'connected';
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not-ready', database });
});

export default router;
