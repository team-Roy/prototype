import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn('REDIS_URL not configured. Using mock Redis.');
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Redis connection failed after 3 retries. Using fallback mode.');
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000);
        },
        enableOfflineQueue: false,
        connectTimeout: 5000,
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Redis connected');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.error('Redis error:', err.message);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        this.logger.warn('Redis connection closed');
      });

      // Try to connect
      await this.client.connect().catch((err) => {
        this.logger.warn('Redis initial connection failed:', err.message);
        this.client = null;
      });
    } catch (error) {
      this.logger.error('Failed to initialize Redis:', error);
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.logger.log('Redis disconnected');
    }
  }

  getClient(): Redis | null {
    return this.isConnected ? this.client : null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error('Redis set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error('Redis del error:', error);
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.client || !this.isConnected) return 0;
    try {
      return await this.client.incr(key);
    } catch (error) {
      this.logger.error('Redis incr error:', error);
      return 0;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.expire(key, ttlSeconds);
    } catch (error) {
      this.logger.error('Redis expire error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error('Redis exists error:', error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.client || !this.isConnected) return [];
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      this.logger.error('Redis keys error:', error);
      return [];
    }
  }
}
