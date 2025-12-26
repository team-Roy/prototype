import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BadgeType } from '@prisma/client';

export class FanBadgeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional()
  loungeId?: string | null;

  @ApiProperty({ enum: BadgeType })
  type!: BadgeType;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  iconUrl?: string | null;

  @ApiProperty()
  awardedAt!: Date;

  @ApiPropertyOptional()
  expiresAt?: Date | null;
}

export class UserBadgesResponseDto {
  @ApiProperty({ type: [FanBadgeResponseDto] })
  badges!: FanBadgeResponseDto[];

  @ApiProperty()
  totalCount!: number;
}

// 뱃지 타입별 정보
export const BADGE_INFO: Record<BadgeType, { name: string; description: string }> = {
  EARLY_BIRD: {
    name: '얼리버드',
    description: '라운지 초기 멤버',
  },
  TOP_FAN: {
    name: '톱 팬',
    description: '월간 최고 기여자',
  },
  ACTIVE_COMMENTER: {
    name: '활발한 댓글러',
    description: '댓글 100개 이상 작성',
  },
  CONTENT_CREATOR: {
    name: '콘텐츠 창작자',
    description: '게시글 50개 이상 작성',
  },
  QUEST_MASTER: {
    name: '퀘스트 마스터',
    description: '모든 퀘스트 완료',
  },
  SUPER_FAN: {
    name: '슈퍼팬',
    description: 'VIP 멤버십 회원',
  },
  CREATOR_PICK: {
    name: '크리에이터 픽',
    description: '크리에이터가 선택한 팬',
  },
};
