import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: NotificationListQueryDto) {
    const { page = 1, limit = 20, unreadOnly = false } = query;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(unreadOnly && { isRead: false }),
    };

    try {
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
    } catch (error) {
      this.logger.error('Failed to fetch notifications:', error);
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      });
    } catch (error) {
      this.logger.error('Failed to get unread count:', error);
      return 0;
    }
  }

  async markAsRead(id: string, userId: string) {
    try {
      return await this.prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true },
      });
    } catch (error) {
      this.logger.error('Failed to mark notification as read:', error);
      return { count: 0 };
    }
  }

  async markAllAsRead(userId: string) {
    try {
      return await this.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
    } catch (error) {
      this.logger.error('Failed to mark all notifications as read:', error);
      return { count: 0 };
    }
  }

  async create(data: CreateNotificationDto) {
    try {
      return await this.prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          message: data.message,
          referenceId: data.referenceId,
          referenceType: data.referenceType,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create notification:', error);
      return null;
    }
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
    try {
      return await this.prisma.notification.deleteMany({
        where: { id, userId },
      });
    } catch (error) {
      this.logger.error('Failed to delete notification:', error);
      return { count: 0 };
    }
  }

  async deleteAll(userId: string) {
    try {
      return await this.prisma.notification.deleteMany({
        where: { userId },
      });
    } catch (error) {
      this.logger.error('Failed to delete all notifications:', error);
      return { count: 0 };
    }
  }
}
