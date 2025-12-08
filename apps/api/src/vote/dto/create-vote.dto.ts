import { IsEnum } from 'class-validator';

export enum VoteTypeEnum {
  UPVOTE = 'UPVOTE',
  DOWNVOTE = 'DOWNVOTE',
}

export class CreateVoteDto {
  @IsEnum(VoteTypeEnum)
  type!: VoteTypeEnum;
}
