import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LoungeService } from './lounge.service';
import {
  CreateLoungeDto,
  UpdateLoungeDto,
  LoungeListQueryDto,
  AddManagerDto,
  BanUserDto,
} from './dto';
import { JwtAuthGuard, OptionalAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Public, Roles } from '../common/decorators';
import { User, UserRole } from '@prisma/client';

@Controller('lounges')
export class LoungeController {
  constructor(private readonly loungeService: LoungeService) {}

  @Get()
  @Public()
  async findAll(@Query() query: LoungeListQueryDto) {
    return this.loungeService.findAll(query);
  }

  @Get('popular')
  @Public()
  async findPopular(@Query('limit') limit?: string) {
    return this.loungeService.findPopular(limit ? parseInt(limit, 10) : 10);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyLounges(@CurrentUser() user: User) {
    return this.loungeService.getMyLounges(user.id);
  }

  @Get(':slug')
  @UseGuards(OptionalAuthGuard)
  async findBySlug(@Param('slug') slug: string, @CurrentUser() user?: User) {
    return this.loungeService.findBySlug(slug, user?.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@CurrentUser() user: User, @Body() dto: CreateLoungeDto) {
    return this.loungeService.create(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: UpdateLoungeDto) {
    return this.loungeService.update(id, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.loungeService.delete(id, user.id);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  async join(@Param('id') id: string, @CurrentUser() user: User) {
    return this.loungeService.join(id, user.id);
  }

  @Delete(':id/leave')
  @UseGuards(JwtAuthGuard)
  async leave(@Param('id') id: string, @CurrentUser() user: User) {
    return this.loungeService.leave(id, user.id);
  }

  @Post(':id/managers')
  @UseGuards(JwtAuthGuard)
  async addManager(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: AddManagerDto) {
    return this.loungeService.addManager(id, user.id, dto);
  }

  @Delete(':id/managers/:userId')
  @UseGuards(JwtAuthGuard)
  async removeManager(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: User
  ) {
    return this.loungeService.removeManager(id, user.id, targetUserId);
  }

  @Get(':id/members')
  async getMembers(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.loungeService.getMembers(
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20
    );
  }

  @Get(':id/bans')
  @UseGuards(JwtAuthGuard)
  async getBannedUsers(@Param('id') id: string, @CurrentUser() user: User) {
    return this.loungeService.getBannedUsers(id, user.id);
  }

  @Post(':id/bans')
  @UseGuards(JwtAuthGuard)
  async banUser(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: BanUserDto) {
    return this.loungeService.banUser(id, user.id, dto.userId, dto.reason, dto.durationDays);
  }

  @Delete(':id/bans/:userId')
  @UseGuards(JwtAuthGuard)
  async unbanUser(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: User
  ) {
    return this.loungeService.unbanUser(id, user.id, targetUserId);
  }

  // =============================================
  // 공식 라운지 관련 API
  // =============================================

  /**
   * 크리에이터가 자신의 라운지를 공식 인증 요청
   * - 크리에이터가 라운지 소유자인 경우 즉시 인증
   * - 소유자가 아닌 경우 관리자 승인 필요
   */
  @Post(':id/claim-official')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CREATOR)
  async claimOfficial(@Param('id') id: string, @CurrentUser() user: User) {
    return this.loungeService.claimOfficial(id, user.id);
  }

  /**
   * 관리자가 라운지를 공식 인증 처리
   */
  @Post(':id/approve-official')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async approveOfficial(
    @Param('id') id: string,
    @Body('creatorId') creatorId: string,
    @CurrentUser() user: User
  ) {
    return this.loungeService.approveOfficial(id, creatorId, user.id);
  }

  /**
   * 관리자가 공식 인증 해제
   */
  @Delete(':id/official')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async revokeOfficial(@Param('id') id: string, @CurrentUser() user: User) {
    return this.loungeService.revokeOfficial(id, user.id);
  }

  /**
   * 특정 크리에이터의 공식 라운지 목록 조회
   */
  @Get('official/:creatorId')
  @Public()
  async getOfficialLounges(@Param('creatorId') creatorId: string) {
    return this.loungeService.getOfficialLounges(creatorId);
  }
}
