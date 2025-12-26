import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CreatorService } from './creator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators';
import { ApplyCreatorDto } from './dto/apply-creator.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { CreatorApplicationStatus, UserRole } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  email: string;
  nickname: string;
  role: string;
}

@Controller('creator')
export class CreatorController {
  constructor(private readonly creatorService: CreatorService) {}

  // 크리에이터 신청
  @UseGuards(JwtAuthGuard)
  @Post('apply')
  async apply(@CurrentUser() user: AuthenticatedUser, @Body() dto: ApplyCreatorDto) {
    const application = await this.creatorService.applyForCreator(user.id, dto);
    return {
      message: '크리에이터 신청이 완료되었습니다. 심사 후 결과를 알려드립니다.',
      application,
    };
  }

  // 내 신청 현황 조회
  @UseGuards(JwtAuthGuard)
  @Get('my-applications')
  async getMyApplications(@CurrentUser() user: AuthenticatedUser) {
    return this.creatorService.getMyApplications(user.id);
  }

  // ======== 관리자 전용 ========

  // 신청 목록 조회
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/applications')
  async getApplications(@Query('status') status?: CreatorApplicationStatus) {
    return this.creatorService.getApplications(status);
  }

  // 신청 상세 조회
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/applications/:id')
  async getApplication(@Param('id') id: string) {
    return this.creatorService.getApplication(id);
  }

  // 신청 처리 (승인/거절)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/applications/:id/review')
  async reviewApplication(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ReviewApplicationDto
  ) {
    return this.creatorService.reviewApplication(id, admin.id, dto);
  }
}
