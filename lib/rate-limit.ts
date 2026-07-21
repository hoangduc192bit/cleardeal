import { isDurableKvConfigured, redisCommand } from "@/lib/kv-rest";

interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

const localBuckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function rateLimit(request: Request, options: RateLimitOptions) {
  const ip = clientIp(request);
  return incrementBucket(`cleardeal:rate:${options.key}:${ip}`, options);
}

async function incrementBucket(bucketKey: string, options: RateLimitOptions) {

  if (isDurableKvConfigured) {
    const count = Number((await redisCommand<number>(["INCR", bucketKey])) ?? 0);
    if (count === 1) {
      await redisCommand(["EXPIRE", bucketKey, options.windowSeconds]);
    }
    if (count > options.limit) {
      return Response.json(
        {
          error: "rate_limited",
          message: "Too many requests. Please try again later.",
          retryAfterSeconds: options.windowSeconds,
        },
        { status: 429, headers: { "Retry-After": String(options.windowSeconds) } },
      );
    }
    return null;
  }

  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "rate_limit_store_not_configured" },
      { status: 503 },
    );
  }

  const now = Date.now();
  const existing = localBuckets.get(bucketKey);
  if (!existing || existing.resetAt <= now) {
    localBuckets.set(bucketKey, {
      count: 1,
      resetAt: now + options.windowSeconds * 1000,
    });
    return null;
  }

  existing.count += 1;
  if (existing.count > options.limit) {
    return Response.json(
      {
        error: "rate_limited",
        message: "Too many requests. Please try again later.",
        retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
      },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((existing.resetAt - now) / 1000)) },
      },
    );
  }

  return null;
}
