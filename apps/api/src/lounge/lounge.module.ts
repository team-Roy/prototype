import { Module } from '@nestjs/common';
import { LoungeController } from './lounge.controller';
import { LoungeService } from './lounge.service';

@Module({
  controllers: [LoungeController],
  providers: [LoungeService],
  exports: [LoungeService],
})
export class LoungeModule {}
