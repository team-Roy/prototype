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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CommentService } from './comment.service';
import { CreateCommentDto, UpdateCommentDto, CommentListQueryDto } from './dto';

@Controller()
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get('posts/:postId/comments')
  async getComments(@Param('postId') postId: string, @Query() query: CommentListQueryDto) {
    return this.commentService.getComments(postId, query);
  }

  @Post('posts/:postId/comments')
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentDto
  ) {
    return this.commentService.create(postId, userId, dto);
  }

  @Patch('comments/:id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCommentDto
  ) {
    return this.commentService.update(id, userId, dto);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.commentService.delete(id, userId);
  }
}
