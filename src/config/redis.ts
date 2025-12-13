import { createClient, RedisClientType } from 'redis';
import { env } from './env';

class RedisClient {
  private client: RedisClientType;

  constructor() {
    this.client = createClient({
      socket: {
        host: env.redis.host,
        port: env.redis.port,
      },
      password: env.redis.password,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });

    this.client.on('reconnecting', () => {
      console.log('Redis Client Reconnecting');
    });
  }

  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      await this.connect();
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis GET error', { key, error });
      throw error;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      await this.connect();
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error('Redis SET error', { key, error });
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.connect();
      await this.client.del(key);
    } catch (error) {
      console.error('Redis DEL error', { key, error });
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.connect();
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error', { key, error });
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      await this.connect();
      return await this.client.keys(pattern);
    } catch (error) {
      console.error('Redis KEYS error', { pattern, error });
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.connect();
      await this.client.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }
}

export const redis = new RedisClient();

