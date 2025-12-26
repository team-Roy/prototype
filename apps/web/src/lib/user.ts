import { api } from './api';

export interface UpdateProfileData {
  nickname?: string;
  bio?: string;
  profileImage?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const userApi = {
  updateProfile: async (data: UpdateProfileData) => {
    const response = await api.patch('/users/profile', data);
    return response.data.data;
  },

  changePassword: async (data: ChangePasswordData) => {
    const response = await api.post('/users/change-password', data);
    return response.data.data;
  },

  checkNickname: async (nickname: string, excludeUserId?: string) => {
    const params = new URLSearchParams({ nickname });
    if (excludeUserId) params.append('excludeUserId', excludeUserId);
    const response = await api.get(`/users/check-nickname?${params}`);
    return response.data.data as { available: boolean };
  },

  deleteAccount: async (password?: string) => {
    const response = await api.delete('/users/account', { data: { password } });
    return response.data.data;
  },
};
