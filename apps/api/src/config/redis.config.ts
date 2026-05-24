import { ConnectionOptions } from 'bullmq';

export function redisConnectionFromUrl(redisUrl?: string): ConnectionOptions {
  const fallback = { host: 'localhost', port: 6379 };

  if (!redisUrl) {
    return fallback;
  }

  try {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      password: parsed.password || undefined,
      username: parsed.username || undefined,
    };
  } catch {
    return fallback;
  }
}