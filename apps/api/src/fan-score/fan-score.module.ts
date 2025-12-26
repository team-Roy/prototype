import { Module } from '@nestjs/common';
import { FanScoreController } from './fan-score.controller';
import { FanScoreService } from './fan-score.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FanScoreController],
  providers: [FanScoreService],
  exports: [FanScoreService],
})
export class FanScoreModule {}
