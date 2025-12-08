import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService
  ) {}

  @Get()
  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unknown',
        redis: 'unknown',
      },
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.services.database = 'healthy';
    } catch {
      checks.services.database = 'unhealthy';
      checks.status = 'degraded';
    }

    try {
      const redisClient = this.redis.getClient();
      if (redisClient) {
        await redisClient.ping();
        checks.services.redis = 'healthy';
      } else {
        checks.services.redis = 'not_configured';
      }
    } catch {
      checks.services.redis = 'unhealthy';
      checks.status = 'degraded';
    }

    return checks;
  }
}
