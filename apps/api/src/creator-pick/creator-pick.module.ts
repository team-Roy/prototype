import { Module } from '@nestjs/common';
import { CreatorPickController } from './creator-pick.controller';
import { CreatorPickService } from './creator-pick.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FanScoreModule } from '../fan-score/fan-score.module';

@Module({
  imports: [PrismaModule, FanScoreModule],
  controllers: [CreatorPickController],
  providers: [CreatorPickService],
  exports: [CreatorPickService],
})
export class CreatorPickModule {}
