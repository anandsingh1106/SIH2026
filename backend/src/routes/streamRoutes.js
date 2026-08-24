import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { subscribeAll } from '../services/eventBus.js';

const router = Router();

/**
 * Server-Sent Events stream (§49).
 *
 * Emits only real domain events published by services. A periodic comment line
 * keeps proxies from closing an idle connection — that is a keep-alive, not
 * fabricated data.
 */
router.get('/', requireAuth, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 5000\n\n');

  const send = (event) => {
    const { channel, payload } = event;

    // Only forward what this user is entitled to see.
    if (channel === 'notification') {
      const targetsUser = payload.userId === req.user.id;
      const targetsAudience =
        !payload.userId &&
        (!payload.role || payload.role === req.user.role) &&
        (!payload.facilityId || payload.facilityId === req.user.facility_id);
      if (!targetsUser && !targetsAudience) return;
    }

    res.write(`event: ${channel}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const unsubscribe = subscribeAll(send);
  const keepAlive = setInterval(() => res.write(': keep-alive\n\n'), 25_000);

  req.on('close', () => {
    clearInterval(keepAlive);
    unsubscribe();
    res.end();
  });
});

export default router;
