import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreatePostDto, UpdatePostDto, PostListQueryDto, PostSortBy } from './dto';
import { Prisma } from '@prisma/client';

const VIEW_COUNT_TTL = 86400; // 24 hours

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  async findAll(loungeId: string, query: PostListQueryDto, userId?: string) {
    const { type, tag, sortBy = PostSortBy.RECENT, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.PostWhereInput = {
      loungeId,
      deletedAt: null,
      ...(type && { type }),
      ...(tag && {
        tags: {
          some: { tag },
        },
      }),
    };

    // Build order by
    const orderBy: Prisma.PostOrderByWithRelationInput[] = [
      { isPinned: 'desc' },
      { isNotice: 'desc' },
    ];

    switch (sortBy) {
      case PostSortBy.POPULAR:
        orderBy.push({ upvoteCount: 'desc' });
        break;
      case PostSortBy.COMMENTS:
        orderBy.push({ commentCount: 'desc' });
        break;
      case PostSortBy.RECENT:
      default:
        orderBy.push({ createdAt: 'desc' });
        break;
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              nickname: true,
              profileImage: true,
            },
          },
          tags: true,
          media: {
            orderBy: { order: 'asc' },
            take: 1,
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      items: posts.map((post) => this.formatPostResponse(post, userId)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, userId?: string, ipAddress?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id, deletedAt: null },
      include: {
        author: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
          },
        },
        lounge: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        tags: true,
        media: {
          orderBy: { order: 'asc' },
        },
        clipInfo: true,
      },
    });

    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다');
    }

    // Increment view count (debounced by IP/user)
    await this.incrementViewCount(id, userId, ipAddress);

    // Get user's vote on this post
    let userVote = null;
    if (userId) {
      const vote = await this.prisma.vote.findUnique({
        where: {
          userId_postId: { userId, postId: id },
        },
      });
      userVote = vote?.type || null;
    }

    return {
      ...this.formatPostResponse(post, userId),
      lounge: post.lounge,
      media: post.media,
      clipInfo: post.clipInfo,
      userVote,
    };
  }

  async create(loungeId: string, userId: string, dto: CreatePostDto) {
    // Check if user is a member of the lounge
    const membership = await this.prisma.loungeMember.findUnique({
      where: {
        userId_loungeId: { userId, loungeId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('라운지 멤버만 게시물을 작성할 수 있습니다');
    }

    // Check if user is banned
    const ban = await this.prisma.loungeBan.findUnique({
      where: {
        userId_loungeId: { userId, loungeId },
      },
    });

    if (ban && (!ban.expiresAt || ban.expiresAt > new Date())) {
      throw new ForbiddenException('이 라운지에서 차단되었습니다');
    }

    const post = await this.prisma.$transaction(async (tx) => {
      // Create post
      const newPost = await tx.post.create({
        data: {
          loungeId,
          authorId: userId,
          type: dto.type,
          title: dto.title,
          content: dto.content,
          isAnonymous: dto.isAnonymous || false,
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

      // Create tags
      if (dto.tags && dto.tags.length > 0) {
        await tx.postTag.createMany({
          data: dto.tags.slice(0, 10).map((tag) => ({
            postId: newPost.id,
            tag: tag.toLowerCase().trim(),
          })),
        });
      }

      // Create media attachments
      if (dto.mediaIds && dto.mediaIds.length > 0) {
        await tx.postMedia.createMany({
          data: dto.mediaIds.slice(0, 10).map((mediaData, index) => {
            // Parse media data (format: "url|type|width|height")
            const parts = mediaData.split('|');
            const url = parts[0];
            const type = (parts[1] as 'IMAGE' | 'VIDEO') || 'IMAGE';
            const width = parts[2] ? parseInt(parts[2]) : null;
            const height = parts[3] ? parseInt(parts[3]) : null;

            return {
              postId: newPost.id,
              url,
              type,
              width,
              height,
              order: index,
            };
          }),
        });
      }

      // Update lounge post count
      await tx.lounge.update({
        where: { id: loungeId },
        data: { postCount: { increment: 1 } },
      });

      return newPost;
    });

    return this.formatPostResponse(post, userId);
  }

  async update(postId: string, userId: string, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('본인 게시물만 수정할 수 있습니다');
    }

    if (post.isAnonymous) {
      throw new BadRequestException('익명 게시물은 수정할 수 없습니다');
    }

    const updatedPost = await this.prisma.$transaction(async (tx) => {
      // Update post
      const updated = await tx.post.update({
        where: { id: postId },
        data: {
          title: dto.title,
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
          tags: true,
        },
      });

      // Update tags if provided
      if (dto.tags !== undefined) {
        await tx.postTag.deleteMany({ where: { postId } });
        if (dto.tags.length > 0) {
          await tx.postTag.createMany({
            data: dto.tags.slice(0, 10).map((tag) => ({
              postId,
              tag: tag.toLowerCase().trim(),
            })),
          });
        }
      }

      return updated;
    });

    return this.formatPostResponse(updatedPost, userId);
  }

  async delete(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
      include: {
        lounge: {
          include: {
            managers: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다');
    }

    const isAuthor = post.authorId === userId;
    const isManager = post.lounge.managers.length > 0;

    if (!isAuthor && !isManager) {
      throw new ForbiddenException('삭제 권한이 없습니다');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: postId },
        data: { deletedAt: new Date() },
      });

      await tx.lounge.update({
        where: { id: post.loungeId },
        data: { postCount: { decrement: 1 } },
      });
    });

    return { message: '게시물이 삭제되었습니다' };
  }

  async pin(postId: string, userId: string) {
    const post = await this.findPostWithManagerCheck(postId, userId);

    await this.prisma.post.update({
      where: { id: postId },
      data: { isPinned: !post.isPinned },
    });

    return { message: post.isPinned ? '고정이 해제되었습니다' : '게시물이 고정되었습니다' };
  }

  async setNotice(postId: string, userId: string) {
    const post = await this.findPostWithManagerCheck(postId, userId);

    await this.prisma.post.update({
      where: { id: postId },
      data: { isNotice: !post.isNotice },
    });

    return { message: post.isNotice ? '공지가 해제되었습니다' : '공지로 설정되었습니다' };
  }

  // Helper methods
  private async findPostWithManagerCheck(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
      include: {
        lounge: {
          include: {
            managers: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다');
    }

    if (post.lounge.managers.length === 0) {
      throw new ForbiddenException('매니저 권한이 필요합니다');
    }

    return post;
  }

  private async incrementViewCount(postId: string, userId?: string, ipAddress?: string) {
    const identifier = userId || ipAddress;
    if (!identifier) return;

    const viewKey = `post:view:${postId}:${identifier}`;
    const hasViewed = await this.redis.exists(viewKey);

    if (!hasViewed) {
      await this.redis.set(viewKey, '1', VIEW_COUNT_TTL);
      await this.prisma.post.update({
        where: { id: postId },
        data: { viewCount: { increment: 1 } },
      });
    }
  }

  private formatPostResponse(
    post: {
      id: string;
      type: string;
      title: string | null;
      content: string;
      isAnonymous: boolean;
      isPinned: boolean;
      isNotice: boolean;
      viewCount: number;
      upvoteCount: number;
      downvoteCount: number;
      commentCount: number;
      createdAt: Date;
      updatedAt: Date;
      authorId: string;
      author?: {
        id: string;
        nickname: string;
        profileImage: string | null;
      };
      tags?: { tag: string }[];
      media?: { url: string; thumbnailUrl: string | null }[];
      _count?: { comments: number };
    },
    _currentUserId?: string
  ) {
    return {
      id: post.id,
      type: post.type,
      title: post.title,
      content: post.content,
      isAnonymous: post.isAnonymous,
      isPinned: post.isPinned,
      isNotice: post.isNotice,
      viewCount: post.viewCount,
      upvoteCount: post.upvoteCount,
      downvoteCount: post.downvoteCount,
      commentCount: post._count?.comments ?? post.commentCount,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.isAnonymous ? { id: '', nickname: '익명', profileImage: null } : post.author,
      tags: post.tags?.map((t) => t.tag) || [],
      thumbnail: post.media?.[0]?.thumbnailUrl || post.media?.[0]?.url || null,
    };
  }
}
