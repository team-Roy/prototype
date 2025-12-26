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
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreatorPickService } from './creator-pick.service';
import {
  CreateCreatorPickDto,
  UpdateCreatorPickDto,
  CreatorPickResponseDto,
  CreatorPickWithPostDto,
  CreatorPickListResponseDto,
} from './dto/creator-pick.dto';

@ApiTags('creator-picks')
@Controller('lounges/:loungeId/creator-picks')
export class CreatorPickController {
  constructor(private readonly creatorPickService: CreatorPickService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '크리에이터 픽 생성' })
  @ApiParam({ name: 'loungeId', description: '라운지 ID' })
  @ApiResponse({ status: 201, type: CreatorPickResponseDto })
  async createPick(
    @Param('loungeId') loungeId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: CreateCreatorPickDto
  ): Promise<CreatorPickResponseDto> {
    return this.creatorPickService.createPick(loungeId, req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '라운지의 크리에이터 픽 목록 조회' })
  @ApiParam({ name: 'loungeId', description: '라운지 ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: CreatorPickListResponseDto })
  async getPicksByLounge(
    @Param('loungeId') loungeId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ): Promise<CreatorPickListResponseDto> {
    return this.creatorPickService.getPicksByLounge(loungeId, page || 1, limit || 20);
  }

  @Get(':id')
  @ApiOperation({ summary: '크리에이터 픽 상세 조회' })
  @ApiParam({ name: 'loungeId', description: '라운지 ID' })
  @ApiParam({ name: 'id', description: '크리에이터 픽 ID' })
  @ApiResponse({ status: 200, type: CreatorPickWithPostDto })
  async getPick(@Param('id') id: string): Promise<CreatorPickWithPostDto> {
    return this.creatorPickService.getPick(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '크리에이터 픽 수정' })
  @ApiParam({ name: 'loungeId', description: '라운지 ID' })
  @ApiParam({ name: 'id', description: '크리에이터 픽 ID' })
  @ApiResponse({ status: 200, type: CreatorPickResponseDto })
  async updatePick(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateCreatorPickDto
  ): Promise<CreatorPickResponseDto> {
    return this.creatorPickService.updatePick(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '크리에이터 픽 삭제' })
  @ApiParam({ name: 'loungeId', description: '라운지 ID' })
  @ApiParam({ name: 'id', description: '크리에이터 픽 ID' })
  @ApiResponse({ status: 204 })
  async deletePick(
    @Param('id') id: string,
    @Request() req: { user: { id: string } }
  ): Promise<void> {
    return this.creatorPickService.deletePick(id, req.user.id);
  }
}
