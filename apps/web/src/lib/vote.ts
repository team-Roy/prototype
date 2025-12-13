import { api } from './api';

export type VoteType = 'UPVOTE' | 'DOWNVOTE';

export interface VoteResponse {
  upvoteCount: number;
  downvoteCount: number;
  userVote: VoteType | null;
}

export const voteApi = {
  votePost: async (postId: string, type: VoteType) => {
    const response = await api.post<{ data: VoteResponse }>(`/posts/${postId}/vote`, { type });
    return response.data.data;
  },

  voteComment: async (commentId: string, type: VoteType) => {
    const response = await api.post<{ data: VoteResponse }>(`/comments/${commentId}/vote`, {
      type,
    });
    return response.data.data;
  },
};
