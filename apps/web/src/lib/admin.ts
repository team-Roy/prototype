import { api } from './api';

export interface AdminStats {
  userCount: number;
  loungeCount: number;
  postCount: number;
  commentCount: number;
  newUsersToday: number;
  newPostsToday: number;
}

export interface AdminUser {
  id: string;
  email: string;
  nickname: string;
  profileImage: string | null;
  role: string;
  provider: string;
  isActive: boolean;
  createdAt: string;
  postCount: number;
  commentCount: number;
}

export interface AdminLounge {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  isOfficial: boolean;
  isActive: boolean;
  memberCount: number;
  postCount: number;
  createdAt: string;
  creator: {
    id: string;
    nickname: string;
  };
}

// 크리에이터 신청 관련 타입
export interface CreatorApplicationUser {
  id: string;
  email: string;
  nickname: string;
  profileImage: string | null;
  bio: string | null;
  createdAt: string;
}

export interface CreatorApplication {
  id: string;
  userId: string;
  creatorName: string;
  channelUrl: string;
  channelType: string;
  followerCount?: string;
  introduction: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  user?: CreatorApplicationUser;
}

export type ReviewAction = 'APPROVE' | 'REJECT';

export interface ReviewApplicationData {
  action: ReviewAction;
  rejectionReason?: string;
}

export const adminApi = {
  // 크리에이터 신청 목록 조회
  getCreatorApplications: async (
    status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  ): Promise<CreatorApplication[]> => {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/creator/admin/applications${params}`);
    return response.data.data;
  },

  // 크리에이터 신청 상세 조회
  getCreatorApplication: async (id: string): Promise<CreatorApplication> => {
    const response = await api.get(`/creator/admin/applications/${id}`);
    return response.data.data;
  },

  // 크리에이터 신청 처리 (승인/거절)
  reviewCreatorApplication: async (
    id: string,
    data: ReviewApplicationData
  ): Promise<{ message: string }> => {
    const response = await api.post(`/creator/admin/applications/${id}/review`, data);
    return response.data.data;
  },

  getStats: async () => {
    const response = await api.get<{ data: AdminStats }>('/admin/stats');
    return response.data.data;
  },

  getUsers: async (params?: {
    q?: string;
    isActive?: boolean;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get<{
      data: {
        items: AdminUser[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      };
    }>('/admin/users', { params });
    return response.data.data;
  },

  toggleUserActive: async (id: string) => {
    const response = await api.post<{ data: { message: string } }>(
      `/admin/users/${id}/toggle-active`
    );
    return response.data.data;
  },

  getLounges: async (params?: {
    q?: string;
    isOfficial?: boolean;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get<{
      data: {
        items: AdminLounge[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      };
    }>('/admin/lounges', { params });
    return response.data.data;
  },

  verifyLounge: async (id: string) => {
    const response = await api.post<{ data: { message: string } }>(`/admin/lounges/${id}/verify`);
    return response.data.data;
  },

  unverifyLounge: async (id: string) => {
    const response = await api.delete<{ data: { message: string } }>(`/admin/lounges/${id}/verify`);
    return response.data.data;
  },
};

// Lounge management API
export interface BannedUser {
  user: {
    id: string;
    nickname: string;
    profileImage: string | null;
  };
  reason: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface LoungeMember {
  id: string;
  nickname: string;
  profileImage: string | null;
  joinedAt: string;
  role: string | null;
}

export const loungeManageApi = {
  getMembers: async (loungeId: string, page?: number, limit?: number) => {
    const response = await api.get<{
      data: {
        items: LoungeMember[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      };
    }>(`/lounges/${loungeId}/members`, { params: { page, limit } });
    return response.data.data;
  },

  getBannedUsers: async (loungeId: string) => {
    const response = await api.get<{ data: BannedUser[] }>(`/lounges/${loungeId}/bans`);
    return response.data.data;
  },

  banUser: async (loungeId: string, userId: string, reason?: string, durationDays?: number) => {
    const response = await api.post<{ data: { message: string } }>(`/lounges/${loungeId}/bans`, {
      userId,
      reason,
      durationDays,
    });
    return response.data.data;
  },

  unbanUser: async (loungeId: string, userId: string) => {
    const response = await api.delete<{ data: { message: string } }>(
      `/lounges/${loungeId}/bans/${userId}`
    );
    return response.data.data;
  },
};
