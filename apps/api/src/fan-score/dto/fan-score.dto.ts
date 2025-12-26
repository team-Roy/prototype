import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum ScoreActionType {
  POST_CREATED = 'POST_CREATED',
  COMMENT_CREATED = 'COMMENT_CREATED',
  VOTE_RECEIVED = 'VOTE_RECEIVED',
  QUEST_COMPLETED = 'QUEST_COMPLETED',
}

// 점수 설정
export const SCORE_CONFIG = {
  POST_CREATED: 10,
  COMMENT_CREATED: 2,
  VOTE_RECEIVED: 1,
  QUEST_COMPLETED: 0, // 퀘스트별로 다름
};

export class FanScoreResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  loungeId!: string;

  @ApiProperty()
  totalScore!: number;

  @ApiProperty()
  monthlyScore!: number;

  @ApiProperty()
  postScore!: number;

  @ApiProperty()
  commentScore!: number;

  @ApiProperty()
  voteScore!: number;

  @ApiProperty()
  questScore!: number;

  @ApiPropertyOptional()
  rank?: number | null;

  @ApiPropertyOptional()
  previousRank?: number | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class FanRankingItemDto {
  @ApiProperty()
  rank!: number;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  nickname!: string;

  @ApiPropertyOptional()
  profileImage?: string | null;

  @ApiProperty()
  totalScore!: number;

  @ApiProperty()
  monthlyScore!: number;

  @ApiPropertyOptional()
  rankChange?: number; // 순위 변동 (+ 상승, - 하락)
}

export class FanRankingResponseDto {
  @ApiProperty({ type: [FanRankingItemDto] })
  rankings!: FanRankingItemDto[];

  @ApiProperty()
  totalCount!: number;

  @ApiPropertyOptional({ type: FanRankingItemDto })
  myRanking?: FanRankingItemDto;
}

export class GetFanRankingDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['total', 'monthly'], default: 'total' })
  @IsOptional()
  @IsEnum(['total', 'monthly'])
  sortBy?: 'total' | 'monthly' = 'total';
}
