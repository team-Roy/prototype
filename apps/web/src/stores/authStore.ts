import { create } from 'zustand';
import { api, setAccessToken } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  profileImage: string | null;
  role: string;
  isEmailVerified: boolean;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface LoginResponse {
  user: AuthUser;
  tokens: TokenResponse;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      set({ isInitialized: true });
      return;
    }

    try {
      set({ isLoading: true });

      // refresh API now returns user info along with tokens - no need for separate /me call
      const refreshResponse = await api.post<{
        data: { user: AuthUser; tokens: TokenResponse };
      }>('/auth/refresh', {
        refreshToken,
      });

      const { user, tokens } = refreshResponse.data.data;
      setAccessToken(tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);

      set({
        user,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem('refreshToken');
      setAccessToken(null);
      set({ isInitialized: true, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });

    try {
      const response = await api.post<{ data: LoginResponse }>('/auth/login', {
        email,
        password,
      });

      const { user, tokens } = response.data.data;

      setAccessToken(tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email: string, password: string, nickname: string) => {
    set({ isLoading: true });

    try {
      await api.post('/auth/register', {
        email,
        password,
        nickname,
      });

      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore errors during logout
    } finally {
      setAccessToken(null);
      localStorage.removeItem('refreshToken');
      set({
        user: null,
        isAuthenticated: false,
      });
    }
  },

  setUser: (user: AuthUser | null) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },
}));
