export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  isAnonymous: boolean;
  upvoteCount: number;
  downvoteCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export enum VoteType {
  UPVOTE = 'UPVOTE',
  DOWNVOTE = 'DOWNVOTE',
}

export interface Vote {
  userId: string;
  postId: string | null;
  commentId: string | null;
  type: VoteType;
  createdAt: Date;
}
