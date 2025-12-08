import { api } from './api';

export type VoteType = 'UPVOTE' | 'DOWNVOTE';

export interface VoteResponse {
  upvoteCount: number;
  downvoteCount: number;
  userVote: VoteType | null;
}

export const voteApi = {
  votePost: async (postId: string, type: VoteType) => {
    const response = await api.post<VoteResponse>(`/posts/${postId}/vote`, { type });
    return response.data;
  },

  voteComment: async (commentId: string, type: VoteType) => {
    const response = await api.post<VoteResponse>(`/comments/${commentId}/vote`, { type });
    return response.data;
  },
};
