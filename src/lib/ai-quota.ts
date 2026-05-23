/**
 * Client-side rate limiter for AI features.
 *
 * IMPORTANT: This is damage-control, not security. localStorage can be
 * cleared, incognito bypasses it, and the API key is still in the bundle.
 * The real protection is the daily quota set on Google AI Studio.
 *
 * Limit: 5 successful AI calls per 24h window, per browser profile.
 */

const STORAGE_KEY = 'ai_quota_v1';
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export const AI_DAILY_LIMIT = 5;

interface QuotaState {
  /** Unix ms timestamps of recent successful calls */
  calls: number[];
}

function read(): QuotaState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { calls: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.calls)) return { calls: [] };
    return parsed;
  } catch {
    return { calls: [] };
  }
}

function write(state: QuotaState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors (private mode, full disk, etc.)
  }
}

/** Drop calls outside the rolling window. */
function prune(state: QuotaState): QuotaState {
  const now = Date.now();
  return { calls: state.calls.filter(t => now - t < WINDOW_MS) };
}

/** Returns how many AI calls the user has left in the current window. */
export function getRemainingQuota(): number {
  const pruned = prune(read());
  return Math.max(0, AI_DAILY_LIMIT - pruned.calls.length);
}

/**
 * Returns ms until the oldest call in the window expires (i.e. the next
 * time a slot frees up). Zero if quota is not full.
 */
export function getResetMs(): number {
  const pruned = prune(read());
  if (pruned.calls.length < AI_DAILY_LIMIT) return 0;
  const oldest = Math.min(...pruned.calls);
  return Math.max(0, oldest + WINDOW_MS - Date.now());
}

/**
 * Atomically check-and-consume one call. Returns true if the call is allowed,
 * false if quota is exhausted. The caller should refund via `refundQuota()`
 * if the underlying AI call ultimately fails so the user is not penalized.
 */
export function consumeQuota(): boolean {
  const pruned = prune(read());
  if (pruned.calls.length >= AI_DAILY_LIMIT) {
    write(pruned);
    return false;
  }
  pruned.calls.push(Date.now());
  write(pruned);
  return true;
}

/** Refund the most recently consumed slot (e.g. if AI request errored). */
export function refundQuota() {
  const state = read();
  if (state.calls.length === 0) return;
  state.calls.sort((a, b) => a - b);
  state.calls.pop();
  write(state);
}

/** Format reset time as a human friendly string. */
export function formatResetIn(ms: number): string {
  if (ms <= 0) return 'sekarang';
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin < 60) return `${totalMin} menit`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (mins === 0) return `${hours} jam`;
  return `${hours} jam ${mins} menit`;
}
