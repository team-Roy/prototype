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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { QuestService } from './quest.service';
import {
  CreateQuestDto,
  UpdateQuestDto,
  QuestResponseDto,
  QuestWithProgressDto,
  QuestListResponseDto,
  GetQuestsDto,
  QuestProgressResponseDto,
} from './dto/quest.dto';

@ApiTags('quests')
@Controller('quests')
export class QuestController {
  constructor(private readonly questService: QuestService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '퀘스트 생성 (크리에이터/관리자)' })
  @ApiResponse({ status: 201, type: QuestResponseDto })
  async createQuest(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateQuestDto
  ): Promise<QuestResponseDto> {
    return this.questService.createQuest(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '퀘스트 목록 조회' })
  @ApiResponse({ status: 200, type: QuestListResponseDto })
  async getQuests(
    @Query() dto: GetQuestsDto,
    @Request() req: { user?: { id: string } }
  ): Promise<QuestListResponseDto> {
    return this.questService.getQuests(dto, req.user?.id);
  }

  @Get('my-progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 퀘스트 진행 상황 조회' })
  @ApiResponse({ status: 200, type: [QuestProgressResponseDto] })
  async getMyProgress(
    @Request() req: { user: { id: string } }
  ): Promise<QuestProgressResponseDto[]> {
    return this.questService.getMyProgress(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '퀘스트 상세 조회' })
  @ApiParam({ name: 'id', description: '퀘스트 ID' })
  @ApiResponse({ status: 200, type: QuestWithProgressDto })
  async getQuest(
    @Param('id') id: string,
    @Request() req: { user?: { id: string } }
  ): Promise<QuestWithProgressDto> {
    return this.questService.getQuest(id, req.user?.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '퀘스트 수정' })
  @ApiParam({ name: 'id', description: '퀘스트 ID' })
  @ApiResponse({ status: 200, type: QuestResponseDto })
  async updateQuest(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateQuestDto
  ): Promise<QuestResponseDto> {
    return this.questService.updateQuest(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '퀘스트 삭제' })
  @ApiParam({ name: 'id', description: '퀘스트 ID' })
  @ApiResponse({ status: 204 })
  async deleteQuest(
    @Param('id') id: string,
    @Request() req: { user: { id: string } }
  ): Promise<void> {
    return this.questService.deleteQuest(id, req.user.id);
  }
}
