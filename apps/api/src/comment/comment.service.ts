import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateCommentDto, UpdateCommentDto, CommentListQueryDto, CommentSortBy } from './dto';

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService
  ) {}

  async getComments(postId: string, query: CommentListQueryDto) {
    const { sortBy = CommentSortBy.RECENT, page = 1, limit = 50 } = query;

    // Verify post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다');
    }

    const orderBy =
      sortBy === CommentSortBy.POPULAR
        ? [{ upvoteCount: 'desc' as const }, { createdAt: 'desc' as const }]
        : [{ createdAt: 'desc' as const }];

    // Get root comments (no parentId) and total count (including replies)
    const [comments, rootTotal, totalWithReplies] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          postId,
          parentId: null,
        },
        include: {
          author: {
            select: {
              id: true,
              nickname: true,
              profileImage: true,
            },
          },
          replies: {
            where: {
              deletedAt: null,
            },
            include: {
              author: {
                select: {
                  id: true,
                  nickname: true,
                  profileImage: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.comment.count({
        where: {
          postId,
          parentId: null,
        },
      }),
      this.prisma.comment.count({
        where: {
          postId,
          deletedAt: null,
        },
      }),
    ]);

    // Format comments with deleted status
    const formattedComments = comments.map((comment) => this.formatComment(comment));

    return {
      items: formattedComments,
      meta: {
        total: totalWithReplies, // Total count including replies for display
        page,
        limit,
        totalPages: Math.ceil(rootTotal / limit), // Pagination based on root comments
      },
    };
  }

  async create(postId: string, userId: string, dto: CreateCommentDto) {
    // Verify post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
      include: {
        lounge: true,
        author: {
          select: { id: true, nickname: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다');
    }

    // Check if user is banned from lounge
    const ban = await this.prisma.loungeBan.findUnique({
      where: {
        userId_loungeId: {
          userId,
          loungeId: post.loungeId,
        },
      },
    });

    if (ban) {
      if (!ban.expiresAt || ban.expiresAt > new Date()) {
        throw new ForbiddenException('이 라운지에서 차단되었습니다');
      }
    }

    // Validate parentId if provided (must be a root comment from same post)
    let parentComment: {
      id: string;
      postId: string;
      authorId: string;
      parentId: string | null;
      isAnonymous: boolean;
      author: { id: string; nickname: string };
    } | null = null;

    if (dto.parentId) {
      parentComment = await this.prisma.comment.findUnique({
        where: { id: dto.parentId, deletedAt: null },
        include: {
          author: {
            select: { id: true, nickname: true },
          },
        },
      });

      if (!parentComment) {
        throw new NotFoundException('부모 댓글을 찾을 수 없습니다');
      }

      if (parentComment.postId !== postId) {
        throw new BadRequestException('잘못된 부모 댓글입니다');
      }

      // Only allow 1 level of replies
      if (parentComment.parentId !== null) {
        throw new BadRequestException('대댓글에는 답글을 달 수 없습니다');
      }
    }

    // Get current user info
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    });

    // Create comment and update post comment count
    const [comment] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: {
          postId,
          authorId: userId,
          content: dto.content,
          isAnonymous: dto.isAnonymous ?? false,
          parentId: dto.parentId,
        },
        include: {
          author: {
            select: {
              id: true,
              nickname: true,
              profileImage: true,
            },
          },
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: {
          commentCount: { increment: 1 },
        },
      }),
    ]);

    // Create notifications
    const commenterNickname = currentUser?.nickname || '알 수 없음';
    const isAnonymous = dto.isAnonymous ?? false;

    if (parentComment) {
      // Reply notification to parent comment author
      if (parentComment.authorId !== userId) {
        await this.notificationService.createReplyNotification(
          parentComment.authorId,
          postId,
          commenterNickname,
          isAnonymous
        );
      }
    } else {
      // Comment notification to post author
      if (post.authorId !== userId) {
        await this.notificationService.createCommentNotification(
          post.authorId,
          postId,
          commenterNickname,
          isAnonymous
        );
      }
    }

    return this.formatComment(comment);
  }

  async update(commentId: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다');
    }

    if (comment.deletedAt) {
      throw new BadRequestException('삭제된 댓글은 수정할 수 없습니다');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('댓글 작성자만 수정할 수 있습니다');
    }

    if (comment.isAnonymous) {
      throw new BadRequestException('익명 댓글은 수정할 수 없습니다');
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        content: dto.content,
      },
      include: {
        author: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
          },
        },
      },
    });

    return this.formatComment(updated);
  }

  async delete(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          include: {
            lounge: {
              include: {
                managers: true,
              },
            },
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다');
    }

    if (comment.deletedAt) {
      throw new BadRequestException('이미 삭제된 댓글입니다');
    }

    // Check permission: author or lounge manager
    const isAuthor = comment.authorId === userId;
    const isManager = comment.post.lounge.managers.some((m) => m.userId === userId);

    if (!isAuthor && !isManager) {
      throw new ForbiddenException('댓글을 삭제할 권한이 없습니다');
    }

    // Soft delete and update comment count
    await this.prisma.$transaction([
      this.prisma.comment.update({
        where: { id: commentId },
        data: { deletedAt: new Date() },
      }),
      this.prisma.post.update({
        where: { id: comment.postId },
        data: {
          commentCount: { decrement: 1 },
        },
      }),
    ]);

    return { success: true };
  }

  private formatComment(comment: {
    id: string;
    content: string;
    isAnonymous: boolean;
    upvoteCount: number;
    downvoteCount: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    parentId: string | null;
    author: {
      id: string;
      nickname: string;
      profileImage: string | null;
    };
    replies?: Array<{
      id: string;
      content: string;
      isAnonymous: boolean;
      upvoteCount: number;
      downvoteCount: number;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
      parentId: string | null;
      author: {
        id: string;
        nickname: string;
        profileImage: string | null;
      };
    }>;
  }): FormattedComment {
    const isDeleted = comment.deletedAt !== null;

    return {
      id: comment.id,
      content: isDeleted ? '삭제된 댓글입니다' : comment.content,
      isAnonymous: comment.isAnonymous,
      isDeleted,
      author: comment.isAnonymous
        ? { id: null, nickname: '익명', profileImage: null }
        : comment.author,
      upvoteCount: comment.upvoteCount,
      downvoteCount: comment.downvoteCount,
      parentId: comment.parentId,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      replies: comment.replies?.map((reply) => this.formatComment(reply)),
    };
  }
}

export interface FormattedComment {
  id: string;
  content: string;
  isAnonymous: boolean;
  isDeleted: boolean;
  author: {
    id: string | null;
    nickname: string;
    profileImage: string | null;
  };
  upvoteCount: number;
  downvoteCount: number;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  replies?: FormattedComment[];
}
