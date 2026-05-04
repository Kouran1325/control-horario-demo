type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

type ConsumeRateLimitParams = {
  key: string;
  limit: number;
  windowMs: number;
};

export function consumeRateLimit({
  key,
  limit,
  windowMs,
}: ConsumeRateLimitParams) {
  const now = Date.now();
  const current = store.get(key);

  if (!current || now > current.resetAt) {
    const next: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };

    store.set(key, next);

    return {
      allowed: true,
      remaining: limit - 1,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function clearRateLimit(key: string) {
  store.delete(key);
}