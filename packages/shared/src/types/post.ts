export enum PostType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  CLIP = 'CLIP',
  FANART = 'FANART',
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

export enum Platform {
  YOUTUBE = 'YOUTUBE',
  TWITCH = 'TWITCH',
  AFREECA = 'AFREECA',
}

export interface Post {
  id: string;
  loungeId: string;
  authorId: string;
  type: PostType;
  title: string | null;
  content: string;
  isAnonymous: boolean;
  viewCount: number;
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  isPinned: boolean;
  isNotice: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PostMedia {
  id: string;
  postId: string;
  type: MediaType;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  fileSize: number | null;
  order: number;
  createdAt: Date;
}

export interface PostTag {
  id: string;
  postId: string;
  tag: string;
}

export interface ClipInfo {
  postId: string;
  sourceUrl: string;
  platform: Platform;
  videoId: string;
  startTime: number | null;
  endTime: number | null;
  creatorName: string | null;
}
