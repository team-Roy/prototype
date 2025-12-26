import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FanScoreService } from '../fan-score/fan-score.service';
import { QuestType, QuestActionType, UserRole, BadgeType } from '@prisma/client';
import { ScoreActionType } from '../fan-score/dto/fan-score.dto';
import {
  CreateQuestDto,
  UpdateQuestDto,
  QuestResponseDto,
  QuestWithProgressDto,
  QuestListResponseDto,
  GetQuestsDto,
  QuestProgressResponseDto,
} from './dto/quest.dto';

@Injectable()
export class QuestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fanScoreService: FanScoreService
  ) {}

  /**
   * 퀘스트 생성 (크리에이터/관리자)
   */
  async createQuest(creatorId: string, dto: CreateQuestDto): Promise<QuestResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: creatorId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (user.role !== UserRole.CREATOR && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('크리에이터만 퀘스트를 생성할 수 있습니다.');
    }

    // 라운지 지정 시 해당 라운지 소유자/매니저인지 확인
    if (dto.loungeId) {
      const isManager = await this.prisma.loungeManager.findUnique({
        where: {
          userId_loungeId: { userId: creatorId, loungeId: dto.loungeId },
        },
      });

      const lounge = await this.prisma.lounge.findUnique({
        where: { id: dto.loungeId },
      });

      if (!lounge) {
        throw new NotFoundException('라운지를 찾을 수 없습니다.');
      }

      if (lounge.creatorId !== creatorId && !isManager && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('해당 라운지에 퀘스트를 생성할 권한이 없습니다.');
      }
    }

    const quest = await this.prisma.quest.create({
      data: {
        creatorId,
        loungeId: dto.loungeId,
        type: dto.type,
        actionType: dto.actionType,
        title: dto.title,
        description: dto.description,
        iconUrl: dto.iconUrl,
        targetCount: dto.targetCount ?? 1,
        rewardScore: dto.rewardScore ?? 10,
        rewardBadgeType: dto.rewardBadgeType,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });

    return quest;
  }

  /**
   * 퀘스트 수정
   */
  async updateQuest(
    questId: string,
    userId: string,
    dto: UpdateQuestDto
  ): Promise<QuestResponseDto> {
    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
    });

    if (!quest) {
      throw new NotFoundException('퀘스트를 찾을 수 없습니다.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (quest.creatorId !== userId && user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('퀘스트 수정 권한이 없습니다.');
    }

    const updated = await this.prisma.quest.update({
      where: { id: questId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.iconUrl !== undefined && { iconUrl: dto.iconUrl }),
        ...(dto.targetCount && { targetCount: dto.targetCount }),
        ...(dto.rewardScore && { rewardScore: dto.rewardScore }),
        ...(dto.rewardBadgeType !== undefined && { rewardBadgeType: dto.rewardBadgeType }),
        ...(dto.endsAt !== undefined && { endsAt: dto.endsAt ? new Date(dto.endsAt) : null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return updated;
  }

  /**
   * 퀘스트 삭제
   */
  async deleteQuest(questId: string, userId: string): Promise<void> {
    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
    });

    if (!quest) {
      throw new NotFoundException('퀘스트를 찾을 수 없습니다.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (quest.creatorId !== userId && user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('퀘스트 삭제 권한이 없습니다.');
    }

    await this.prisma.quest.delete({
      where: { id: questId },
    });
  }

  /**
   * 퀘스트 목록 조회 (진행 상황 포함)
   */
  async getQuests(dto: GetQuestsDto, userId?: string): Promise<QuestListResponseDto> {
    const { type, loungeId, includeCompleted, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;
    const now = new Date();

    const whereCondition: {
      type?: QuestType;
      loungeId?: string | null;
      isActive: boolean;
      startsAt: { lte: Date };
      OR: { endsAt: null | { gt: Date } }[];
    } = {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    };

    if (type) {
      whereCondition.type = type;
    }

    if (loungeId) {
      whereCondition.loungeId = loungeId;
    }

    const [quests, totalCount] = await Promise.all([
      this.prisma.quest.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.quest.count({ where: whereCondition }),
    ]);

    // 사용자의 진행 상황 조회
    let progressMap: Map<
      string,
      { currentCount: number; isCompleted: boolean; completedAt: Date | null }
    > = new Map();

    if (userId) {
      const progresses = await this.prisma.questProgress.findMany({
        where: {
          userId,
          questId: { in: quests.map((q) => q.id) },
        },
      });

      progressMap = new Map(
        progresses.map((p) => [
          p.questId,
          { currentCount: p.currentCount, isCompleted: p.isCompleted, completedAt: p.completedAt },
        ])
      );
    }

    const questsWithProgress: QuestWithProgressDto[] = quests
      .map((quest) => {
        const progress = progressMap.get(quest.id);
        const currentCount = progress?.currentCount ?? 0;
        const isCompleted = progress?.isCompleted ?? false;

        return {
          ...quest,
          currentCount,
          isCompleted,
          completedAt: progress?.completedAt ?? null,
          progressPercentage: Math.min(100, Math.round((currentCount / quest.targetCount) * 100)),
        };
      })
      .filter((q) => includeCompleted || !q.isCompleted);

    return {
      quests: questsWithProgress,
      totalCount: includeCompleted ? totalCount : questsWithProgress.length,
    };
  }

  /**
   * 퀘스트 상세 조회
   */
  async getQuest(questId: string, userId?: string): Promise<QuestWithProgressDto> {
    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
    });

    if (!quest) {
      throw new NotFoundException('퀘스트를 찾을 수 없습니다.');
    }

    let progress = null;
    if (userId) {
      progress = await this.prisma.questProgress.findUnique({
        where: {
          userId_questId: { userId, questId },
        },
      });
    }

    const currentCount = progress?.currentCount ?? 0;

    return {
      ...quest,
      currentCount,
      isCompleted: progress?.isCompleted ?? false,
      completedAt: progress?.completedAt ?? null,
      progressPercentage: Math.min(100, Math.round((currentCount / quest.targetCount) * 100)),
    };
  }

  /**
   * 퀘스트 진행 상황 업데이트
   */
  async updateProgress(
    userId: string,
    actionType: QuestActionType,
    loungeId?: string
  ): Promise<QuestProgressResponseDto[]> {
    const now = new Date();

    // 해당 액션에 맞는 활성화된 퀘스트 조회
    const quests = await this.prisma.quest.findMany({
      where: {
        actionType,
        isActive: true,
        startsAt: { lte: now },
        AND: [
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          loungeId ? { OR: [{ loungeId }, { loungeId: null }] } : { loungeId: null },
        ],
      },
    });

    const updatedProgresses: QuestProgressResponseDto[] = [];

    for (const quest of quests) {
      // 진행 상황 가져오기 또는 생성
      let progress = await this.prisma.questProgress.findUnique({
        where: {
          userId_questId: { userId, questId: quest.id },
        },
      });

      if (progress?.isCompleted) {
        // 이미 완료된 퀘스트는 스킵
        continue;
      }

      if (!progress) {
        progress = await this.prisma.questProgress.create({
          data: {
            userId,
            questId: quest.id,
            currentCount: 1,
          },
        });
      } else {
        progress = await this.prisma.questProgress.update({
          where: { id: progress.id },
          data: {
            currentCount: { increment: 1 },
          },
        });
      }

      // 퀘스트 완료 확인
      if (progress.currentCount >= quest.targetCount && !progress.isCompleted) {
        progress = await this.prisma.questProgress.update({
          where: { id: progress.id },
          data: {
            isCompleted: true,
            completedAt: now,
          },
        });

        // 보상 지급
        await this.grantReward(userId, quest, loungeId);
      }

      updatedProgresses.push(progress);
    }

    return updatedProgresses;
  }

  /**
   * 퀘스트 완료 보상 지급
   */
  private async grantReward(
    userId: string,
    quest: {
      id: string;
      rewardScore: number;
      rewardBadgeType: BadgeType | null;
      loungeId: string | null;
    },
    loungeId?: string
  ): Promise<void> {
    const targetLoungeId = loungeId || quest.loungeId;

    // 점수 보상
    if (quest.rewardScore > 0 && targetLoungeId) {
      await this.fanScoreService.addScore(
        userId,
        targetLoungeId,
        ScoreActionType.QUEST_COMPLETED,
        quest.rewardScore
      );
    }

    // 뱃지 보상
    if (quest.rewardBadgeType) {
      await this.fanScoreService.awardBadge(userId, targetLoungeId, quest.rewardBadgeType);
    }
  }

  /**
   * 내 퀘스트 진행 상황 조회
   */
  async getMyProgress(userId: string): Promise<QuestProgressResponseDto[]> {
    const progresses = await this.prisma.questProgress.findMany({
      where: { userId },
      include: {
        quest: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return progresses;
  }

  /**
   * 일일 퀘스트 초기화 (크론잡용)
   */
  async resetDailyQuests(): Promise<number> {
    const result = await this.prisma.questProgress.deleteMany({
      where: {
        quest: {
          type: QuestType.DAILY,
        },
      },
    });

    return result.count;
  }

  /**
   * 주간 퀘스트 초기화 (크론잡용)
   */
  async resetWeeklyQuests(): Promise<number> {
    const result = await this.prisma.questProgress.deleteMany({
      where: {
        quest: {
          type: QuestType.WEEKLY,
        },
      },
    });

    return result.count;
  }
}
