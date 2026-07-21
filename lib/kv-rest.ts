const redisUrl =
  process.env.KV_REST_API_URL ??
  process.env.UPSTASH_REDIS_REST_URL;

const redisToken =
  process.env.KV_REST_API_TOKEN ??
  process.env.UPSTASH_REDIS_REST_TOKEN;

export const isDurableKvConfigured = Boolean(redisUrl && redisToken);

export async function redisCommand<T>(command: (string | number)[]): Promise<T | undefined> {
  if (!redisUrl || !redisToken) return undefined;

  const response = await fetch(redisUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) {
    throw new Error(`KV command failed: ${response.status}`);
  }

  const body = (await response.json()) as { result?: T };
  return body.result;
}
