interface RpcRetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
}

interface RpcQueueOptions extends RpcRetryOptions {
  minIntervalMs?: number;
}

function errorText(cause: unknown) {
  if (cause instanceof Error) return cause.message;
  if (cause && typeof cause === "object") {
    const value = cause as { details?: unknown; shortMessage?: unknown; message?: unknown };
    return [value.shortMessage, value.details, value.message].filter((item) => typeof item === "string").join(" ");
  }
  return String(cause);
}

export function isTransientRpcError(cause: unknown) {
  return /request limit|rate limit|too many requests|\b429\b|timeout|timed out|temporarily unavailable|failed to fetch|network error/i.test(errorText(cause));
}

export async function withRpcRetry<T>(operation: () => Promise<T>, options: RpcRetryOptions = {}) {
  const attempts = options.attempts ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const sleep = options.sleep ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (cause) {
      if (attempt === attempts - 1 || !isTransientRpcError(cause)) throw cause;
      await sleep(baseDelayMs * (2 ** attempt));
    }
  }

  throw new Error("Arc RPC retry loop exhausted.");
}

export function createRpcReadQueue(options: RpcQueueOptions = {}) {
  const minIntervalMs = options.minIntervalMs ?? 400;
  const sleep = options.sleep ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
  let tail = Promise.resolve();
  let lastStartedAt = 0;

  return function queuedRead<T>(operation: () => Promise<T>) {
    const result = tail.then(async () => {
      const delay = Math.max(0, minIntervalMs - (Date.now() - lastStartedAt));
      if (delay > 0) await sleep(delay);
      lastStartedAt = Date.now();
      return withRpcRetry(operation, { ...options, sleep });
    });
    tail = result.then(() => undefined, () => undefined);
    return result;
  };
}

export async function mapWithConcurrency<T, R>(items: readonly T[], concurrency: number, worker: (item: T, index: number) => Promise<R>) {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error("Concurrency must be a positive integer.");
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
  return results;
}
