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
import { CreateLoungeDto, UpdateLoungeDto, LoungeListQueryDto, AddManagerDto } from './dto';
import { JwtAuthGuard, OptionalAuthGuard } from '../auth/guards';
import { CurrentUser, Public } from '../common/decorators';
import { User } from '@prisma/client';

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
}
