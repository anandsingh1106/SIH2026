import { env, isProduction } from './config/env.js';
import { getDb, closeDb } from './db/connection.js';
import { runMigrations } from './db/migrator.js';
import { ensureDemoQueueForToday } from './db/demoQueue.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';
import { networkInterfaces } from 'node:os';

/** Every non-internal IPv4 address of this machine, for the startup banner. */
function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((nic) => nic && nic.family === 'IPv4' && !nic.internal)
    .map((nic) => nic.address);
}

async function start() {
  getDb();
  // Applying pending migrations at boot keeps dev environments consistent.
  await runMigrations({ silent: true });

  // The OPD queue only shows a single day, so a demo opened tomorrow would find
  // an empty desk. Top today's queue up rather than expecting a manual reseed.
  if (!isProduction) {
    try {
      ensureDemoQueueForToday();
    } catch (err) {
      // A demo convenience must never stop the API from starting.
      logger.warn('Could not seed the demo OPD queue', { message: err.message });
    }
  }

  const app = createApp();
  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info(`ArogyaSetu API listening on http://localhost:${env.PORT}`, {
      env: env.NODE_ENV,
      host: env.HOST,
    });

    // When bound to every interface, print the LAN addresses too. Phones and
    // other machines need one of these, and hunting for it in ipconfig is the
    // step this setup exists to remove.
    if (env.HOST === '0.0.0.0' && !isProduction) {
      for (const address of lanAddresses()) {
        logger.info(`  reachable on your network at http://${address}:${env.PORT}`);
      }
    }
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
