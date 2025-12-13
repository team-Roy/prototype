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

export const adminApi = {
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
