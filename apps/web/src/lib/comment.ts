import { api } from './api';

export interface CommentAuthor {
  id: string | null;
  nickname: string;
  profileImage: string | null;
}

export interface CommentResponse {
  id: string;
  content: string;
  isAnonymous: boolean;
  isDeleted: boolean;
  author: CommentAuthor;
  upvoteCount: number;
  downvoteCount: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  replies?: CommentResponse[];
}

export interface CommentListResponse {
  items: CommentResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type CommentSortBy = 'recent' | 'popular';

export interface CommentListParams {
  sortBy?: CommentSortBy;
  page?: number;
  limit?: number;
}

export interface CreateCommentData {
  content: string;
  isAnonymous?: boolean;
  parentId?: string;
}

export interface UpdateCommentData {
  content: string;
}

export const commentApi = {
  getList: async (postId: string, params?: CommentListParams) => {
    const response = await api.get<{ data: CommentListResponse }>(`/posts/${postId}/comments`, {
      params,
    });
    return response.data.data;
  },

  create: async (postId: string, data: CreateCommentData) => {
    const response = await api.post<{ data: CommentResponse }>(`/posts/${postId}/comments`, data);
    return response.data.data;
  },

  update: async (commentId: string, data: UpdateCommentData) => {
    const response = await api.patch<{ data: CommentResponse }>(`/comments/${commentId}`, data);
    return response.data.data;
  },

  delete: async (commentId: string) => {
    const response = await api.delete<{ data: { message: string } }>(`/comments/${commentId}`);
    return response.data.data;
  },
};
