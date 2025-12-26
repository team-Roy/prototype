import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FanScoreService } from './fan-score.service';
import { FanScoreResponseDto, FanRankingResponseDto, GetFanRankingDto } from './dto/fan-score.dto';
import { UserBadgesResponseDto } from './dto/fan-badge.dto';

@ApiTags('fan-score')
@Controller('fan-score')
export class FanScoreController {
  constructor(private readonly fanScoreService: FanScoreService) {}

  @Get('lounge/:loungeId/ranking')
  @ApiOperation({ summary: '라운지 팬 랭킹 조회' })
  @ApiParam({ name: 'loungeId', description: '라운지 ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['total', 'monthly'] })
  @ApiResponse({ status: 200, type: FanRankingResponseDto })
  async getLoungeRanking(
    @Param('loungeId') loungeId: string,
    @Query() dto: GetFanRankingDto,
    @Request() req: { user?: { id: string } }
  ): Promise<FanRankingResponseDto> {
    return this.fanScoreService.getFanRanking(loungeId, dto, req.user?.id);
  }

  @Get('lounge/:loungeId/my-score')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '특정 라운지 내 내 점수 조회' })
  @ApiParam({ name: 'loungeId', description: '라운지 ID' })
  @ApiResponse({ status: 200, type: FanScoreResponseDto })
  async getMyLoungeScore(
    @Param('loungeId') loungeId: string,
    @Request() req: { user: { id: string } }
  ): Promise<FanScoreResponseDto> {
    return this.fanScoreService.getOrCreateFanScore(req.user.id, loungeId);
  }

  @Get('my-scores')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '모든 라운지 내 점수 조회' })
  @ApiResponse({ status: 200, type: [FanScoreResponseDto] })
  async getMyAllScores(@Request() req: { user: { id: string } }): Promise<FanScoreResponseDto[]> {
    return this.fanScoreService.getUserAllScores(req.user.id);
  }

  @Get('user/:userId/lounge/:loungeId')
  @ApiOperation({ summary: '특정 사용자의 라운지 점수 조회' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiParam({ name: 'loungeId', description: '라운지 ID' })
  @ApiResponse({ status: 200, type: FanScoreResponseDto })
  async getUserLoungeScore(
    @Param('userId') userId: string,
    @Param('loungeId') loungeId: string
  ): Promise<FanScoreResponseDto | null> {
    return this.fanScoreService.getUserScore(userId, loungeId);
  }

  @Get('my-badges')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 뱃지 목록 조회' })
  @ApiQuery({ name: 'loungeId', required: false, description: '특정 라운지 뱃지만 조회' })
  @ApiResponse({ status: 200, type: UserBadgesResponseDto })
  async getMyBadges(
    @Request() req: { user: { id: string } },
    @Query('loungeId') loungeId?: string
  ): Promise<UserBadgesResponseDto> {
    const badges = await this.fanScoreService.getUserBadges(req.user.id, loungeId);
    return {
      badges,
      totalCount: badges.length,
    };
  }

  @Get('user/:userId/badges')
  @ApiOperation({ summary: '특정 사용자의 뱃지 목록 조회' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiQuery({ name: 'loungeId', required: false, description: '특정 라운지 뱃지만 조회' })
  @ApiResponse({ status: 200, type: UserBadgesResponseDto })
  async getUserBadges(
    @Param('userId') userId: string,
    @Query('loungeId') loungeId?: string
  ): Promise<UserBadgesResponseDto> {
    const badges = await this.fanScoreService.getUserBadges(userId, loungeId);
    return {
      badges,
      totalCount: badges.length,
    };
  }
}
