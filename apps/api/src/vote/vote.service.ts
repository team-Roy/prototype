import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VoteTypeEnum } from './dto';
import { VoteType } from '@prisma/client';

export interface VoteResponse {
  upvoteCount: number;
  downvoteCount: number;
  userVote: VoteType | null;
}

@Injectable()
export class VoteService {
  constructor(private readonly prisma: PrismaService) {}

  async votePost(postId: string, userId: string, type: VoteTypeEnum): Promise<VoteResponse> {
    // Check post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다');
    }

    // Find existing vote
    const existingVote = await this.prisma.vote.findFirst({
      where: {
        userId,
        postId,
      },
    });

    const voteType = type as unknown as VoteType;

    if (existingVote) {
      if (existingVote.type === voteType) {
        // Same type: toggle off (delete vote)
        await this.prisma.$transaction([
          this.prisma.vote.delete({
            where: { id: existingVote.id },
          }),
          this.prisma.post.update({
            where: { id: postId },
            data: {
              [type === VoteTypeEnum.UPVOTE ? 'upvoteCount' : 'downvoteCount']: {
                decrement: 1,
              },
            },
          }),
        ]);

        return this.getPostVoteStatus(postId, userId);
      } else {
        // Different type: change vote
        await this.prisma.$transaction([
          this.prisma.vote.update({
            where: { id: existingVote.id },
            data: { type: voteType },
          }),
          this.prisma.post.update({
            where: { id: postId },
            data: {
              upvoteCount: {
                [type === VoteTypeEnum.UPVOTE ? 'increment' : 'decrement']: 1,
              },
              downvoteCount: {
                [type === VoteTypeEnum.DOWNVOTE ? 'increment' : 'decrement']: 1,
              },
            },
          }),
        ]);

        return this.getPostVoteStatus(postId, userId);
      }
    } else {
      // No existing vote: create new
      await this.prisma.$transaction([
        this.prisma.vote.create({
          data: {
            userId,
            postId,
            type: voteType,
          },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: {
            [type === VoteTypeEnum.UPVOTE ? 'upvoteCount' : 'downvoteCount']: {
              increment: 1,
            },
          },
        }),
      ]);

      return this.getPostVoteStatus(postId, userId);
    }
  }

  async voteComment(commentId: string, userId: string, type: VoteTypeEnum): Promise<VoteResponse> {
    // Check comment exists
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId, deletedAt: null },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다');
    }

    // Find existing vote
    const existingVote = await this.prisma.vote.findFirst({
      where: {
        userId,
        commentId,
      },
    });

    const voteType = type as unknown as VoteType;

    if (existingVote) {
      if (existingVote.type === voteType) {
        // Same type: toggle off (delete vote)
        await this.prisma.$transaction([
          this.prisma.vote.delete({
            where: { id: existingVote.id },
          }),
          this.prisma.comment.update({
            where: { id: commentId },
            data: {
              [type === VoteTypeEnum.UPVOTE ? 'upvoteCount' : 'downvoteCount']: {
                decrement: 1,
              },
            },
          }),
        ]);

        return this.getCommentVoteStatus(commentId, userId);
      } else {
        // Different type: change vote
        await this.prisma.$transaction([
          this.prisma.vote.update({
            where: { id: existingVote.id },
            data: { type: voteType },
          }),
          this.prisma.comment.update({
            where: { id: commentId },
            data: {
              upvoteCount: {
                [type === VoteTypeEnum.UPVOTE ? 'increment' : 'decrement']: 1,
              },
              downvoteCount: {
                [type === VoteTypeEnum.DOWNVOTE ? 'increment' : 'decrement']: 1,
              },
            },
          }),
        ]);

        return this.getCommentVoteStatus(commentId, userId);
      }
    } else {
      // No existing vote: create new
      await this.prisma.$transaction([
        this.prisma.vote.create({
          data: {
            userId,
            commentId,
            type: voteType,
          },
        }),
        this.prisma.comment.update({
          where: { id: commentId },
          data: {
            [type === VoteTypeEnum.UPVOTE ? 'upvoteCount' : 'downvoteCount']: {
              increment: 1,
            },
          },
        }),
      ]);

      return this.getCommentVoteStatus(commentId, userId);
    }
  }

  async getPostVoteStatus(postId: string, userId: string | null): Promise<VoteResponse> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        upvoteCount: true,
        downvoteCount: true,
      },
    });

    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다');
    }

    let userVote: VoteType | null = null;
    if (userId) {
      const vote = await this.prisma.vote.findFirst({
        where: {
          userId,
          postId,
        },
      });
      userVote = vote?.type ?? null;
    }

    return {
      upvoteCount: post.upvoteCount,
      downvoteCount: post.downvoteCount,
      userVote,
    };
  }

  async getCommentVoteStatus(commentId: string, userId: string | null): Promise<VoteResponse> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        upvoteCount: true,
        downvoteCount: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다');
    }

    let userVote: VoteType | null = null;
    if (userId) {
      const vote = await this.prisma.vote.findFirst({
        where: {
          userId,
          commentId,
        },
      });
      userVote = vote?.type ?? null;
    }

    return {
      upvoteCount: comment.upvoteCount,
      downvoteCount: comment.downvoteCount,
      userVote,
    };
  }
}
