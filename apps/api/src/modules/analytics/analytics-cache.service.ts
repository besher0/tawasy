import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class AnalyticsCacheService implements OnModuleDestroy {
  private readonly redis: Redis | null;

  constructor() {
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
      void this.redis.connect().catch(() => undefined);
    } else {
      this.redis = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) {
      return null;
    }

    const raw = await this.redis.get(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  }

  async set(key: string, data: unknown, ttlSeconds = 300): Promise<void> {
    if (!this.redis) {
      return;
    }

    await this.redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}