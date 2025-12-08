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
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PostService } from './post.service';
import { CreatePostDto, UpdatePostDto, PostListQueryDto } from './dto';
import { JwtAuthGuard, OptionalAuthGuard } from '../auth/guards';
import { CurrentUser } from '../common/decorators';
import { User } from '@prisma/client';

@Controller()
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get('lounges/:loungeId/posts')
  @UseGuards(OptionalAuthGuard)
  async findAll(
    @Param('loungeId') loungeId: string,
    @Query() query: PostListQueryDto,
    @CurrentUser() user?: User
  ) {
    return this.postService.findAll(loungeId, query, user?.id);
  }

  @Get('posts/:id')
  @UseGuards(OptionalAuthGuard)
  async findById(@Param('id') id: string, @CurrentUser() user?: User, @Req() req?: Request) {
    const ipAddress = req?.ip || (req?.headers['x-forwarded-for'] as string);
    return this.postService.findById(id, user?.id, ipAddress);
  }

  @Post('lounges/:loungeId/posts')
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('loungeId') loungeId: string,
    @CurrentUser() user: User,
    @Body() dto: CreatePostDto
  ) {
    return this.postService.create(loungeId, user.id, dto);
  }

  @Patch('posts/:id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: UpdatePostDto) {
    return this.postService.update(id, user.id, dto);
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.postService.delete(id, user.id);
  }

  @Post('posts/:id/pin')
  @UseGuards(JwtAuthGuard)
  async pin(@Param('id') id: string, @CurrentUser() user: User) {
    return this.postService.pin(id, user.id);
  }

  @Post('posts/:id/notice')
  @UseGuards(JwtAuthGuard)
  async setNotice(@Param('id') id: string, @CurrentUser() user: User) {
    return this.postService.setNotice(id, user.id);
  }
}
