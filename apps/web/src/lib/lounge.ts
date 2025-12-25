import { api } from './api';

export interface LoungeResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  icon: string | null;
  isOfficial: boolean;
  memberCount: number;
  postCount: number;
  createdAt: string;
  creator?: {
    id: string;
    nickname: string;
    profileImage: string | null;
  };
}

export interface LoungeDetailResponse extends LoungeResponse {
  rules: string | null;
  managers: {
    user: {
      id: string;
      nickname: string;
      profileImage: string | null;
    };
    role: 'OWNER' | 'MANAGER';
  }[];
  isMember: boolean;
  isManager: boolean;
  managerRole: 'OWNER' | 'MANAGER' | null;
}

export interface LoungeListResponse {
  items: LoungeResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateLoungeDto {
  name: string;
  slug?: string;
  description?: string;
}

export interface UpdateLoungeDto {
  name?: string;
  description?: string;
  coverImage?: string;
  icon?: string;
  rules?: string;
}

export type LoungeSortBy = 'popular' | 'recent' | 'name';

export const loungeApi = {
  getList: async (params?: {
    q?: string;
    sortBy?: LoungeSortBy;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get<{ data: LoungeListResponse }>('/lounges', { params });
    return response.data.data;
  },

  getPopular: async (limit?: number) => {
    const response = await api.get<{ data: LoungeResponse[] }>('/lounges/popular', {
      params: { limit },
    });
    return response.data.data;
  },

  getMyLounges: async () => {
    const response = await api.get<{ data: (LoungeResponse & { joinedAt: string })[] }>(
      '/lounges/my'
    );
    return response.data.data;
  },

  getBySlug: async (slug: string) => {
    const response = await api.get<{ data: LoungeDetailResponse }>(`/lounges/${slug}`);
    return response.data.data;
  },

  create: async (data: CreateLoungeDto) => {
    const response = await api.post<{ data: LoungeResponse }>('/lounges', data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateLoungeDto) => {
    const response = await api.patch<{ data: LoungeResponse }>(`/lounges/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<{ data: { message: string } }>(`/lounges/${id}`);
    return response.data.data;
  },

  join: async (id: string) => {
    const response = await api.post<{ data: { message: string } }>(`/lounges/${id}/join`);
    return response.data.data;
  },

  leave: async (id: string) => {
    const response = await api.delete<{ data: { message: string } }>(`/lounges/${id}/leave`);
    return response.data.data;
  },

  addManager: async (id: string, userId: string, role?: 'OWNER' | 'MANAGER') => {
    const response = await api.post<{ data: { message: string } }>(`/lounges/${id}/managers`, {
      userId,
      role,
    });
    return response.data.data;
  },

  removeManager: async (id: string, userId: string) => {
    const response = await api.delete<{ data: { message: string } }>(
      `/lounges/${id}/managers/${userId}`
    );
    return response.data.data;
  },

  getMembers: async (id: string, page: number = 1, limit: number = 20) => {
    const response = await api.get<{
      data: {
        items: {
          user: {
            id: string;
            nickname: string;
            profileImage: string | null;
          };
          role: 'OWNER' | 'MANAGER' | null;
          joinedAt: string;
        }[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      };
    }>(`/lounges/${id}/members`, { params: { page, limit } });
    return response.data.data;
  },
};
