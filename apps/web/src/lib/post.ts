import { api } from './api';

export type PostType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'CLIP' | 'FANART';
export type PostSortBy = 'recent' | 'popular' | 'comments';
export type VoteType = 'UPVOTE' | 'DOWNVOTE';

export interface PostResponse {
  id: string;
  type: PostType;
  title: string | null;
  content: string;
  isAnonymous: boolean;
  isPinned: boolean;
  isNotice: boolean;
  viewCount: number;
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    nickname: string;
    profileImage: string | null;
  };
  tags: string[];
  thumbnail: string | null;
}

export interface PostDetailResponse extends PostResponse {
  lounge: {
    id: string;
    name: string;
    slug: string;
  };
  media: {
    id: string;
    type: 'IMAGE' | 'VIDEO';
    url: string;
    thumbnailUrl: string | null;
    width: number | null;
    height: number | null;
    duration: number | null;
  }[];
  clipInfo: {
    sourceUrl: string;
    platform: 'YOUTUBE' | 'TWITCH' | 'AFREECA';
    videoId: string;
    startTime: number | null;
    endTime: number | null;
    creatorName: string | null;
  } | null;
  userVote: VoteType | null;
}

export interface PostListResponse {
  items: PostResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreatePostDto {
  type: PostType;
  title?: string;
  content: string;
  isAnonymous?: boolean;
  tags?: string[];
  mediaIds?: string[];
}

export interface UpdatePostDto {
  title?: string;
  content?: string;
  tags?: string[];
}

export const postApi = {
  getList: async (
    loungeId: string,
    params?: {
      type?: PostType;
      tag?: string;
      sortBy?: PostSortBy;
      page?: number;
      limit?: number;
    }
  ) => {
    const response = await api.get<{ data: PostListResponse }>(`/lounges/${loungeId}/posts`, {
      params,
    });
    return response.data.data;
  },

  getById: async (id: string) => {
    const response = await api.get<{ data: PostDetailResponse }>(`/posts/${id}`);
    return response.data.data;
  },

  create: async (loungeId: string, data: CreatePostDto) => {
    const response = await api.post<{ data: PostResponse }>(`/lounges/${loungeId}/posts`, data);
    return response.data.data;
  },

  update: async (id: string, data: UpdatePostDto) => {
    const response = await api.patch<{ data: PostResponse }>(`/posts/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<{ data: { message: string } }>(`/posts/${id}`);
    return response.data.data;
  },

  pin: async (id: string) => {
    const response = await api.post<{ data: { message: string } }>(`/posts/${id}/pin`);
    return response.data.data;
  },

  setNotice: async (id: string) => {
    const response = await api.post<{ data: { message: string } }>(`/posts/${id}/notice`);
    return response.data.data;
  },
};
