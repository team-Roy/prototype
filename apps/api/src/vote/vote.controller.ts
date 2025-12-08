import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VoteService } from './vote.service';
import { CreateVoteDto } from './dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class VoteController {
  constructor(private readonly voteService: VoteService) {}

  @Post('posts/:id/vote')
  async votePost(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVoteDto
  ) {
    return this.voteService.votePost(id, userId, dto.type);
  }

  @Post('comments/:id/vote')
  async voteComment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVoteDto
  ) {
    return this.voteService.voteComment(id, userId, dto.type);
  }
}
