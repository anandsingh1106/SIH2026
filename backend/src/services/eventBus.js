import { EventEmitter } from 'events';

/**
 * In-process pub/sub backing the SSE stream (§49).
 *
 * Real domain events are published here by services; the SSE endpoint
 * subscribes and forwards them. Nothing is simulated on a timer.
 *
 * Note: this is per-process. A multi-instance deployment would swap this for
 * Redis pub/sub or similar — the publish/subscribe interface stays the same.
 */
const emitter = new EventEmitter();
// Each connected SSE client adds listeners; the default cap of 10 is too low.
emitter.setMaxListeners(0);

export const CHANNELS = ['notification', 'referral', 'queue', 'bed'];

export function publish(channel, payload) {
  emitter.emit(channel, { channel, payload, at: new Date().toISOString() });
}

export function subscribe(channel, handler) {
  emitter.on(channel, handler);
  return () => emitter.off(channel, handler);
}

export function subscribeAll(handler) {
  const unsubscribes = CHANNELS.map((channel) => subscribe(channel, handler));
  return () => unsubscribes.forEach((fn) => fn());
}
