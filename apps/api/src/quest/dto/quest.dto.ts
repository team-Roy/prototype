import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  IsDateString,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestType, QuestActionType, BadgeType } from '@prisma/client';

export class CreateQuestDto {
  @ApiProperty({ enum: QuestType })
  @IsEnum(QuestType)
  type!: QuestType;

  @ApiProperty({ enum: QuestActionType })
  @IsEnum(QuestActionType)
  actionType!: QuestActionType;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  title!: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  targetCount?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  rewardScore?: number = 10;

  @ApiPropertyOptional({ enum: BadgeType })
  @IsOptional()
  @IsEnum(BadgeType)
  rewardBadgeType?: BadgeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  loungeId?: string;
}

export class UpdateQuestDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  targetCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  rewardScore?: number;

  @ApiPropertyOptional({ enum: BadgeType })
  @IsOptional()
  @IsEnum(BadgeType)
  rewardBadgeType?: BadgeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QuestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  loungeId?: string | null;

  @ApiPropertyOptional()
  creatorId?: string | null;

  @ApiProperty({ enum: QuestType })
  type!: QuestType;

  @ApiProperty({ enum: QuestActionType })
  actionType!: QuestActionType;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional()
  iconUrl?: string | null;

  @ApiProperty()
  targetCount!: number;

  @ApiProperty()
  rewardScore!: number;

  @ApiPropertyOptional({ enum: BadgeType })
  rewardBadgeType?: BadgeType | null;

  @ApiProperty()
  startsAt!: Date;

  @ApiPropertyOptional()
  endsAt?: Date | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class QuestWithProgressDto extends QuestResponseDto {
  @ApiPropertyOptional()
  currentCount?: number;

  @ApiPropertyOptional()
  isCompleted?: boolean;

  @ApiPropertyOptional()
  completedAt?: Date | null;

  @ApiProperty()
  progressPercentage!: number;
}

export class QuestProgressResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  questId!: string;

  @ApiProperty()
  currentCount!: number;

  @ApiProperty()
  isCompleted!: boolean;

  @ApiPropertyOptional()
  completedAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class QuestListResponseDto {
  @ApiProperty({ type: [QuestWithProgressDto] })
  quests!: QuestWithProgressDto[];

  @ApiProperty()
  totalCount!: number;
}

export class GetQuestsDto {
  @ApiPropertyOptional({ enum: QuestType })
  @IsOptional()
  @IsEnum(QuestType)
  type?: QuestType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  loungeId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeCompleted?: boolean = false;

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
  limit?: number = 20;
}
