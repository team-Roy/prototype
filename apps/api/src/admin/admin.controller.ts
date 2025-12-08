import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminUserListQueryDto, AdminLoungeListQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  async getUsers(@Query() query: AdminUserListQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Post('users/:id/toggle-active')
  async toggleUserActive(@Param('id') id: string) {
    return this.adminService.toggleUserActive(id);
  }

  @Get('lounges')
  async getLounges(@Query() query: AdminLoungeListQueryDto) {
    return this.adminService.getLounges(query);
  }

  @Post('lounges/:id/verify')
  async verifyLounge(@Param('id') id: string) {
    return this.adminService.verifyLounge(id);
  }

  @Delete('lounges/:id/verify')
  async unverifyLounge(@Param('id') id: string) {
    return this.adminService.unverifyLounge(id);
  }
}
