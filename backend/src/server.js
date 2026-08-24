import { env } from './config/env.js';
import { getDb, closeDb } from './db/connection.js';
import { runMigrations } from './db/migrator.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';

async function start() {
  getDb();
  // Applying pending migrations at boot keeps dev environments consistent.
  await runMigrations({ silent: true });

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`ArogyaSetu API listening on http://localhost:${env.PORT}`, {
      env: env.NODE_ENV,
    });
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down.`);
    server.close(() => {
      closeDb();
      process.exit(0);
    });
    // Do not hang forever if connections refuse to drain.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error('Failed to start server', { message: err.message, stack: err.stack });
  process.exit(1);
});
