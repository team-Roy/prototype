import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationListQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: string, @Query() query: NotificationListQueryDto) {
    return this.notificationService.findAll(userId, query);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.notificationService.markAsRead(id, userId);
    return { success: true };
  }

  @Post('read-all')
  async markAllAsRead(@CurrentUser('id') userId: string) {
    await this.notificationService.markAllAsRead(userId);
    return { success: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.notificationService.delete(id, userId);
    return { success: true };
  }

  @Delete()
  async deleteAll(@CurrentUser('id') userId: string) {
    await this.notificationService.deleteAll(userId);
    return { success: true };
  }
}
