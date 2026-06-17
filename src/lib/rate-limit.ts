// Simple in-memory rate limiter
// Resets on server restart — acceptable for MVP
// Disabled in test environments (NODE_ENV=test or PLAYWRIGHT=true)

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const UNLIMITED = { allowed: true, remaining: Infinity, resetAt: Infinity } as const;

function isTestEnv(): boolean {
  return process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT === "true";
}

// Clean up expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const defaultConfig: RateLimitConfig = {
  maxRequests: 10, // 10 attempts
  windowMs: 60 * 1000, // per 60 seconds
};

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = defaultConfig,
): { allowed: boolean; remaining: number; resetAt: number } {
  // Skip rate limiting entirely in test environments
  if (isTestEnv()) return { ...UNLIMITED };

  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  entry.count++;
  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}
