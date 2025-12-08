import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminUserListQueryDto,
  AdminLoungeListQueryDto,
  AdminUserSortBy,
  AdminLoungeSortBy,
} from './dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers(query: AdminUserListQueryDto) {
    const { q, isActive, sortBy = AdminUserSortBy.RECENT, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(q && {
        OR: [
          { email: { contains: q, mode: 'insensitive' as const } },
          { nickname: { contains: q, mode: 'insensitive' as const } },
        ],
      }),
      ...(isActive !== undefined && { isActive }),
    };

    const orderBy = (() => {
      switch (sortBy) {
        case AdminUserSortBy.EMAIL:
          return { email: 'asc' as const };
        case AdminUserSortBy.NICKNAME:
          return { nickname: 'asc' as const };
        case AdminUserSortBy.RECENT:
        default:
          return { createdAt: 'desc' as const };
      }
    })();

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          nickname: true,
          profileImage: true,
          role: true,
          provider: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              posts: true,
              comments: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((user) => ({
        ...user,
        postCount: user._count.posts,
        commentCount: user._count.comments,
        _count: undefined,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLounges(query: AdminLoungeListQueryDto) {
    const { q, isOfficial, sortBy = AdminLoungeSortBy.RECENT, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(q && {
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { slug: { contains: q, mode: 'insensitive' as const } },
        ],
      }),
      ...(isOfficial !== undefined && { isOfficial }),
    };

    const orderBy = (() => {
      switch (sortBy) {
        case AdminLoungeSortBy.NAME:
          return { name: 'asc' as const };
        case AdminLoungeSortBy.MEMBERS:
          return { memberCount: 'desc' as const };
        case AdminLoungeSortBy.POSTS:
          return { postCount: 'desc' as const };
        case AdminLoungeSortBy.RECENT:
        default:
          return { createdAt: 'desc' as const };
      }
    })();

    const [items, total] = await Promise.all([
      this.prisma.lounge.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          icon: true,
          isOfficial: true,
          isActive: true,
          memberCount: true,
          postCount: true,
          createdAt: true,
          creator: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.lounge.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async verifyLounge(loungeId: string) {
    const lounge = await this.prisma.lounge.findUnique({
      where: { id: loungeId },
    });

    if (!lounge) {
      throw new NotFoundException('라운지를 찾을 수 없습니다');
    }

    await this.prisma.lounge.update({
      where: { id: loungeId },
      data: { isOfficial: true },
    });

    return { success: true };
  }

  async unverifyLounge(loungeId: string) {
    const lounge = await this.prisma.lounge.findUnique({
      where: { id: loungeId },
    });

    if (!lounge) {
      throw new NotFoundException('라운지를 찾을 수 없습니다');
    }

    await this.prisma.lounge.update({
      where: { id: loungeId },
      data: { isOfficial: false },
    });

    return { success: true };
  }

  async toggleUserActive(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    if (user.role === 'ADMIN') {
      throw new ForbiddenException('관리자 계정은 비활성화할 수 없습니다');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });

    return { success: true, isActive: !user.isActive };
  }

  async getStats() {
    const [userCount, loungeCount, postCount, commentCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.lounge.count(),
      this.prisma.post.count({ where: { deletedAt: null } }),
      this.prisma.comment.count({ where: { deletedAt: null } }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [newUsersToday, newPostsToday] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.post.count({ where: { createdAt: { gte: today }, deletedAt: null } }),
    ]);

    return {
      userCount,
      loungeCount,
      postCount,
      commentCount,
      newUsersToday,
      newPostsToday,
    };
  }
}
