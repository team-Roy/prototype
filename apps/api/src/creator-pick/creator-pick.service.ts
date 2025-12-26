import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FanScoreService } from '../fan-score/fan-score.service';
import { BadgeType, UserRole } from '@prisma/client';
import {
  CreateCreatorPickDto,
  UpdateCreatorPickDto,
  CreatorPickResponseDto,
  CreatorPickWithPostDto,
  CreatorPickListResponseDto,
} from './dto/creator-pick.dto';

@Injectable()
export class CreatorPickService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fanScoreService: FanScoreService
  ) {}

  /**
   * 크리에이터 픽 생성
   */
  async createPick(
    loungeId: string,
    creatorId: string,
    dto: CreateCreatorPickDto
  ): Promise<CreatorPickResponseDto> {
    // 라운지 확인 및 권한 검사
    const lounge = await this.prisma.lounge.findUnique({
      where: { id: loungeId },
    });

    if (!lounge) {
      throw new NotFoundException('라운지를 찾을 수 없습니다.');
    }

    // 크리에이터인지 확인
    const user = await this.prisma.user.findUnique({
      where: { id: creatorId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 라운지 소유자이거나 매니저인지 확인
    const isManager = await this.prisma.loungeManager.findUnique({
      where: {
        userId_loungeId: { userId: creatorId, loungeId },
      },
    });

    if (lounge.creatorId !== creatorId && !isManager && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('크리에이터 픽 권한이 없습니다.');
    }

    // 게시글 확인
    const post = await this.prisma.post.findUnique({
      where: { id: dto.postId },
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    if (post.loungeId !== loungeId) {
      throw new ForbiddenException('해당 라운지의 게시글이 아닙니다.');
    }

    // 이미 픽된 게시글인지 확인
    const existingPick = await this.prisma.creatorPick.findUnique({
      where: { postId: dto.postId },
    });

    if (existingPick) {
      throw new ConflictException('이미 크리에이터 픽된 게시글입니다.');
    }

    // 크리에이터 픽 생성
    const pick = await this.prisma.creatorPick.create({
      data: {
        loungeId,
        postId: dto.postId,
        pickedBy: creatorId,
        comment: dto.comment,
      },
    });

    // 게시글 작성자에게 CREATOR_PICK 뱃지 부여
    if (post.authorId !== creatorId) {
      await this.fanScoreService.awardBadge(post.authorId, loungeId, BadgeType.CREATOR_PICK);
    }

    return pick;
  }

  /**
   * 크리에이터 픽 수정
   */
  async updatePick(
    pickId: string,
    userId: string,
    dto: UpdateCreatorPickDto
  ): Promise<CreatorPickResponseDto> {
    const pick = await this.prisma.creatorPick.findUnique({
      where: { id: pickId },
    });

    if (!pick) {
      throw new NotFoundException('크리에이터 픽을 찾을 수 없습니다.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (pick.pickedBy !== userId && user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('수정 권한이 없습니다.');
    }

    const updated = await this.prisma.creatorPick.update({
      where: { id: pickId },
      data: {
        comment: dto.comment,
      },
    });

    return updated;
  }

  /**
   * 크리에이터 픽 삭제
   */
  async deletePick(pickId: string, userId: string): Promise<void> {
    const pick = await this.prisma.creatorPick.findUnique({
      where: { id: pickId },
    });

    if (!pick) {
      throw new NotFoundException('크리에이터 픽을 찾을 수 없습니다.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (pick.pickedBy !== userId && user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('삭제 권한이 없습니다.');
    }

    await this.prisma.creatorPick.delete({
      where: { id: pickId },
    });
  }

  /**
   * 라운지의 크리에이터 픽 목록 조회
   */
  async getPicksByLounge(
    loungeId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<CreatorPickListResponseDto> {
    const skip = (page - 1) * limit;

    const [picks, totalCount] = await Promise.all([
      this.prisma.creatorPick.findMany({
        where: { loungeId },
        include: {
          post: {
            include: {
              author: {
                select: {
                  id: true,
                  nickname: true,
                  profileImage: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.creatorPick.count({ where: { loungeId } }),
    ]);

    return {
      picks: picks.map((pick) => ({
        id: pick.id,
        loungeId: pick.loungeId,
        postId: pick.postId,
        pickedBy: pick.pickedBy,
        comment: pick.comment,
        createdAt: pick.createdAt,
        post: {
          id: pick.post.id,
          title: pick.post.title,
          content: pick.post.content,
          type: pick.post.type,
          authorId: pick.post.authorId,
          author: pick.post.author,
          upvoteCount: pick.post.upvoteCount,
          commentCount: pick.post.commentCount,
          createdAt: pick.post.createdAt,
        },
      })),
      totalCount,
    };
  }

  /**
   * 특정 게시글의 크리에이터 픽 조회
   */
  async getPickByPost(postId: string): Promise<CreatorPickResponseDto | null> {
    const pick = await this.prisma.creatorPick.findUnique({
      where: { postId },
    });

    return pick;
  }

  /**
   * 크리에이터 픽 상세 조회
   */
  async getPick(pickId: string): Promise<CreatorPickWithPostDto> {
    const pick = await this.prisma.creatorPick.findUnique({
      where: { id: pickId },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                nickname: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });

    if (!pick) {
      throw new NotFoundException('크리에이터 픽을 찾을 수 없습니다.');
    }

    return {
      id: pick.id,
      loungeId: pick.loungeId,
      postId: pick.postId,
      pickedBy: pick.pickedBy,
      comment: pick.comment,
      createdAt: pick.createdAt,
      post: {
        id: pick.post.id,
        title: pick.post.title,
        content: pick.post.content,
        type: pick.post.type,
        authorId: pick.post.authorId,
        author: pick.post.author,
        upvoteCount: pick.post.upvoteCount,
        commentCount: pick.post.commentCount,
        createdAt: pick.post.createdAt,
      },
    };
  }
}
