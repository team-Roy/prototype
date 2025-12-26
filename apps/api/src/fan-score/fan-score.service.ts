import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BadgeType } from '@prisma/client';
import {
  ScoreActionType,
  SCORE_CONFIG,
  FanScoreResponseDto,
  FanRankingItemDto,
  FanRankingResponseDto,
  GetFanRankingDto,
} from './dto/fan-score.dto';
import { BADGE_INFO, FanBadgeResponseDto } from './dto/fan-badge.dto';

@Injectable()
export class FanScoreService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 팬 점수 조회 또는 생성
   */
  async getOrCreateFanScore(userId: string, loungeId: string): Promise<FanScoreResponseDto> {
    let fanScore = await this.prisma.fanScore.findUnique({
      where: {
        userId_loungeId: { userId, loungeId },
      },
    });

    if (!fanScore) {
      fanScore = await this.prisma.fanScore.create({
        data: {
          userId,
          loungeId,
        },
      });
    }

    return fanScore;
  }

  /**
   * 점수 추가
   */
  async addScore(
    userId: string,
    loungeId: string,
    action: ScoreActionType,
    customScore?: number
  ): Promise<FanScoreResponseDto> {
    const score = customScore ?? SCORE_CONFIG[action];

    // upsert로 점수 추가
    const fanScore = await this.prisma.fanScore.upsert({
      where: {
        userId_loungeId: { userId, loungeId },
      },
      create: {
        userId,
        loungeId,
        totalScore: score,
        monthlyScore: score,
        postScore: action === ScoreActionType.POST_CREATED ? score : 0,
        commentScore: action === ScoreActionType.COMMENT_CREATED ? score : 0,
        voteScore: action === ScoreActionType.VOTE_RECEIVED ? score : 0,
        questScore: action === ScoreActionType.QUEST_COMPLETED ? score : 0,
      },
      update: {
        totalScore: { increment: score },
        monthlyScore: { increment: score },
        ...(action === ScoreActionType.POST_CREATED && {
          postScore: { increment: score },
        }),
        ...(action === ScoreActionType.COMMENT_CREATED && {
          commentScore: { increment: score },
        }),
        ...(action === ScoreActionType.VOTE_RECEIVED && {
          voteScore: { increment: score },
        }),
        ...(action === ScoreActionType.QUEST_COMPLETED && {
          questScore: { increment: score },
        }),
      },
    });

    // 뱃지 조건 확인 및 부여
    await this.checkAndAwardBadges(userId, loungeId, fanScore);

    return fanScore;
  }

  /**
   * 라운지 팬 랭킹 조회
   */
  async getFanRanking(
    loungeId: string,
    dto: GetFanRankingDto,
    currentUserId?: string
  ): Promise<FanRankingResponseDto> {
    const { page = 1, limit = 20, sortBy = 'total' } = dto;
    const skip = (page - 1) * limit;

    // 라운지 존재 확인
    const lounge = await this.prisma.lounge.findUnique({
      where: { id: loungeId },
    });

    if (!lounge) {
      throw new NotFoundException('라운지를 찾을 수 없습니다.');
    }

    const orderBy =
      sortBy === 'monthly' ? { monthlyScore: 'desc' as const } : { totalScore: 'desc' as const };

    const [fanScores, totalCount] = await Promise.all([
      this.prisma.fanScore.findMany({
        where: { loungeId },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              profileImage: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.fanScore.count({
        where: { loungeId },
      }),
    ]);

    const rankings: FanRankingItemDto[] = fanScores.map((fs, index) => ({
      rank: skip + index + 1,
      userId: fs.userId,
      nickname: fs.user.nickname,
      profileImage: fs.user.profileImage || undefined,
      totalScore: fs.totalScore,
      monthlyScore: fs.monthlyScore,
      rankChange: fs.previousRank ? fs.previousRank - (fs.rank || skip + index + 1) : undefined,
    }));

    // 현재 사용자의 랭킹 조회
    let myRanking: FanRankingItemDto | undefined;
    if (currentUserId) {
      const myScore = await this.prisma.fanScore.findUnique({
        where: {
          userId_loungeId: { userId: currentUserId, loungeId },
        },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              profileImage: true,
            },
          },
        },
      });

      if (myScore) {
        // 내 순위 계산
        const scoreField = sortBy === 'monthly' ? 'monthlyScore' : 'totalScore';
        const myRank = await this.prisma.fanScore.count({
          where: {
            loungeId,
            [scoreField]: { gt: myScore[scoreField] },
          },
        });

        myRanking = {
          rank: myRank + 1,
          userId: myScore.userId,
          nickname: myScore.user.nickname,
          profileImage: myScore.user.profileImage || undefined,
          totalScore: myScore.totalScore,
          monthlyScore: myScore.monthlyScore,
          rankChange: myScore.previousRank ? myScore.previousRank - (myRank + 1) : undefined,
        };
      }
    }

    return {
      rankings,
      totalCount,
      myRanking,
    };
  }

  /**
   * 사용자의 특정 라운지 점수 조회
   */
  async getUserScore(userId: string, loungeId: string): Promise<FanScoreResponseDto | null> {
    const fanScore = await this.prisma.fanScore.findUnique({
      where: {
        userId_loungeId: { userId, loungeId },
      },
    });

    return fanScore;
  }

  /**
   * 사용자의 모든 라운지 점수 조회
   */
  async getUserAllScores(userId: string): Promise<FanScoreResponseDto[]> {
    const fanScores = await this.prisma.fanScore.findMany({
      where: { userId },
      include: {
        lounge: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
      orderBy: { totalScore: 'desc' },
    });

    return fanScores;
  }

  /**
   * 뱃지 조건 확인 및 부여
   */
  private async checkAndAwardBadges(
    userId: string,
    loungeId: string,
    fanScore: FanScoreResponseDto
  ): Promise<void> {
    const badgesToAward: BadgeType[] = [];

    // ACTIVE_COMMENTER: 댓글 점수 200 이상 (댓글 100개 이상)
    if (fanScore.commentScore >= 200) {
      badgesToAward.push(BadgeType.ACTIVE_COMMENTER);
    }

    // CONTENT_CREATOR: 게시글 점수 500 이상 (게시글 50개 이상)
    if (fanScore.postScore >= 500) {
      badgesToAward.push(BadgeType.CONTENT_CREATOR);
    }

    // 뱃지 부여
    for (const badgeType of badgesToAward) {
      await this.awardBadge(userId, loungeId, badgeType);
    }
  }

  /**
   * 뱃지 부여
   */
  async awardBadge(
    userId: string,
    loungeId: string | null,
    badgeType: BadgeType,
    expiresAt?: Date
  ): Promise<FanBadgeResponseDto> {
    const badgeInfo = BADGE_INFO[badgeType];

    const badge = await this.prisma.fanBadge.upsert({
      where: {
        userId_loungeId_type: {
          userId,
          loungeId: loungeId || '',
          type: badgeType,
        },
      },
      create: {
        userId,
        loungeId,
        type: badgeType,
        name: badgeInfo.name,
        description: badgeInfo.description,
        expiresAt,
      },
      update: {
        expiresAt, // 갱신 시 만료일 업데이트
      },
    });

    return badge;
  }

  /**
   * 사용자 뱃지 목록 조회
   */
  async getUserBadges(userId: string, loungeId?: string): Promise<FanBadgeResponseDto[]> {
    const where: { userId: string; loungeId?: string | null } = { userId };

    if (loungeId) {
      where.loungeId = loungeId;
    }

    const badges = await this.prisma.fanBadge.findMany({
      where: {
        userId,
        ...(loungeId ? { OR: [{ loungeId }, { loungeId: null }] } : {}),
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { awardedAt: 'desc' },
    });

    return badges;
  }

  /**
   * 월간 점수 초기화 (크론잡용)
   */
  async resetMonthlyScores(): Promise<number> {
    // 현재 순위를 이전 순위로 저장
    await this.prisma.$executeRaw`
      UPDATE fan_scores
      SET previous_rank = rank
    `;

    // 월간 점수 초기화
    const result = await this.prisma.fanScore.updateMany({
      data: {
        monthlyScore: 0,
      },
    });

    return result.count;
  }

  /**
   * 라운지 내 순위 업데이트 (크론잡용)
   */
  async updateRankings(loungeId: string): Promise<void> {
    const fanScores = await this.prisma.fanScore.findMany({
      where: { loungeId },
      orderBy: { totalScore: 'desc' },
      select: { id: true },
    });

    // 순위 업데이트
    await Promise.all(
      fanScores.map((fs, index) =>
        this.prisma.fanScore.update({
          where: { id: fs.id },
          data: { rank: index + 1 },
        })
      )
    );
  }

  /**
   * TOP_FAN 뱃지 부여 (월간 1위)
   */
  async awardTopFanBadge(loungeId: string): Promise<void> {
    const topFan = await this.prisma.fanScore.findFirst({
      where: { loungeId },
      orderBy: { monthlyScore: 'desc' },
    });

    if (topFan && topFan.monthlyScore > 0) {
      // 1개월 유효 뱃지
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await this.awardBadge(topFan.userId, loungeId, BadgeType.TOP_FAN, expiresAt);
    }
  }
}
