import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationListQueryDto } from './dto';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  message: string;
  referenceId?: string;
  referenceType?: string;
}

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: NotificationListQueryDto) {
    const { page = 1, limit = 20, unreadOnly = false } = query;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(unreadOnly && { isRead: false }),
    };

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async create(data: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        message: data.message,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
      },
    });
  }

  async createCommentNotification(
    postAuthorId: string,
    postId: string,
    commenterNickname: string,
    isAnonymous: boolean
  ) {
    const displayName = isAnonymous ? '익명' : commenterNickname;
    await this.create({
      userId: postAuthorId,
      type: 'COMMENT',
      message: `${displayName}님이 회원님의 게시물에 댓글을 남겼습니다.`,
      referenceId: postId,
      referenceType: 'post',
    });
  }

  async createReplyNotification(
    parentAuthorId: string,
    postId: string,
    replierNickname: string,
    isAnonymous: boolean
  ) {
    const displayName = isAnonymous ? '익명' : replierNickname;
    await this.create({
      userId: parentAuthorId,
      type: 'REPLY',
      message: `${displayName}님이 회원님의 댓글에 답글을 남겼습니다.`,
      referenceId: postId,
      referenceType: 'post',
    });
  }

  async createVoteNotification(
    authorId: string,
    referenceId: string,
    referenceType: 'post' | 'comment',
    voteCount: number
  ) {
    if (voteCount % 10 !== 0) return;

    await this.create({
      userId: authorId,
      type: 'VOTE',
      message: `회원님의 ${referenceType === 'post' ? '게시물' : '댓글'}이 추천 ${voteCount}개를 달성했습니다!`,
      referenceId,
      referenceType,
    });
  }

  async createMentionNotification(
    mentionedUserId: string,
    postId: string,
    mentionerNickname: string
  ) {
    await this.create({
      userId: mentionedUserId,
      type: 'MENTION',
      message: `${mentionerNickname}님이 회원님을 멘션했습니다.`,
      referenceId: postId,
      referenceType: 'post',
    });
  }

  async delete(id: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: { id, userId },
    });
  }

  async deleteAll(userId: string) {
    return this.prisma.notification.deleteMany({
      where: { userId },
    });
  }
}
