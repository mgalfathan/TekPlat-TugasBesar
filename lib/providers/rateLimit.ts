// Simple token-bucket rate limiter for free-tier API-Football (10 req/min).
// In-process only — works for local dev and a single Node server. Not suitable for
// distributed serverless without an external store (Redis / Hyperdrive / D1).

const MAX_PER_MINUTE = 9; // safety margin below 10/min
const WINDOW_MS = 60_000;

const timestamps: number[] = [];
let waiters: Array<() => void> = [];

function prune(now: number) {
  while (timestamps.length && now - timestamps[0] > WINDOW_MS) timestamps.shift();
}

function flushWaiters() {
  const now = Date.now();
  prune(now);
  while (waiters.length && timestamps.length < MAX_PER_MINUTE) {
    const w = waiters.shift();
    timestamps.push(now);
    w?.();
  }
  if (waiters.length && timestamps.length >= MAX_PER_MINUTE) {
    const oldest = timestamps[0];
    const waitMs = Math.max(50, WINDOW_MS - (now - oldest));
    setTimeout(flushWaiters, waitMs);
  }
}

export function acquireToken(): Promise<void> {
  return new Promise(resolve => {
    waiters.push(resolve);
    flushWaiters();
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
