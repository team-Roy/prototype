import { useAuthStore } from '@/stores/authStore';
import { api, setAccessToken } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
  setAccessToken: jest.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('authStore', () => {
  const mockApi = api as jest.Mocked<typeof api>;
  const mockSetAccessToken = setAccessToken as jest.MockedFunction<typeof setAccessToken>;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    // Reset store state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        nickname: 'testuser',
        profileImage: null,
        role: 'USER',
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      };

      mockApi.post.mockResolvedValue({
        data: {
          data: {
            user: mockUser,
            tokens: mockTokens,
          },
        },
      });

      const { login } = useAuthStore.getState();
      await login('test@example.com', 'password');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(mockSetAccessToken).toHaveBeenCalledWith('access-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token');
    });

    it('should handle login error', async () => {
      mockApi.post.mockRejectedValue(new Error('Invalid credentials'));

      const { login } = useAuthStore.getState();
      await expect(login('test@example.com', 'wrong-password')).rejects.toThrow(
        'Invalid credentials'
      );

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      mockApi.post.mockResolvedValue({ data: { data: {} } });

      const { register } = useAuthStore.getState();
      await register('new@example.com', 'password', 'newuser');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', {
        email: 'new@example.com',
        password: 'password',
        nickname: 'newuser',
      });

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('should handle registration error', async () => {
      mockApi.post.mockRejectedValue(new Error('Email already exists'));

      const { register } = useAuthStore.getState();
      await expect(register('existing@example.com', 'password', 'user')).rejects.toThrow(
        'Email already exists'
      );
    });
  });

  describe('logout', () => {
    it('should logout and clear state', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          nickname: 'testuser',
          profileImage: null,
          role: 'USER',
        },
        isAuthenticated: true,
      });
      localStorageMock.setItem('refreshToken', 'refresh-token');

      mockApi.post.mockResolvedValue({ data: {} });

      const { logout } = useAuthStore.getState();
      await logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(mockSetAccessToken).toHaveBeenCalledWith(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
    });

    it('should still logout even if API fails', async () => {
      useAuthStore.setState({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          nickname: 'testuser',
          profileImage: null,
          role: 'USER',
        },
        isAuthenticated: true,
      });

      mockApi.post.mockRejectedValue(new Error('Network error'));

      const { logout } = useAuthStore.getState();
      await logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should skip if already initialized', async () => {
      useAuthStore.setState({ isInitialized: true });

      const { initialize } = useAuthStore.getState();
      await initialize();

      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('should set initialized without refresh token', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('should restore session with valid refresh token', async () => {
      localStorageMock.getItem.mockReturnValue('refresh-token');

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        nickname: 'testuser',
        profileImage: null,
        role: 'USER',
      };

      mockApi.post.mockResolvedValue({
        data: {
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
        },
      });

      mockApi.get.mockResolvedValue({
        data: { data: mockUser },
      });

      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isInitialized).toBe(true);
    });

    it('should clear session on invalid refresh token', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-refresh-token');
      mockApi.post.mockRejectedValue(new Error('Invalid token'));

      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isInitialized).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
    });
  });

  describe('setUser', () => {
    it('should set user and authenticated state', () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        nickname: 'testuser',
        profileImage: null,
        role: 'USER',
      };

      const { setUser } = useAuthStore.getState();
      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should clear user and set unauthenticated', () => {
      useAuthStore.setState({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          nickname: 'testuser',
          profileImage: null,
          role: 'USER',
        },
        isAuthenticated: true,
      });

      const { setUser } = useAuthStore.getState();
      setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('login edge cases', () => {
    it('should set isLoading to true during login', async () => {
      mockApi.post.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: {
                    data: {
                      user: {
                        id: 'user-1',
                        email: 'test@example.com',
                        nickname: 'test',
                        profileImage: null,
                        role: 'USER',
                      },
                      tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: 3600 },
                    },
                  },
                }),
              100
            )
          )
      );

      const { login } = useAuthStore.getState();
      const loginPromise = login('test@example.com', 'password');

      // Check loading state immediately after calling login
      expect(useAuthStore.getState().isLoading).toBe(true);

      await loginPromise;

      // Loading should be false after completion
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should handle network error during login', async () => {
      const networkError = new Error('Network Error');
      mockApi.post.mockRejectedValue(networkError);

      const { login } = useAuthStore.getState();
      await expect(login('test@example.com', 'password')).rejects.toThrow('Network Error');

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle empty credentials', async () => {
      mockApi.post.mockRejectedValue(new Error('Validation failed'));

      const { login } = useAuthStore.getState();
      await expect(login('', '')).rejects.toThrow('Validation failed');
    });
  });

  describe('register edge cases', () => {
    it('should handle duplicate nickname error', async () => {
      mockApi.post.mockRejectedValue(new Error('Nickname already exists'));

      const { register } = useAuthStore.getState();
      await expect(register('new@example.com', 'password', 'existingNickname')).rejects.toThrow(
        'Nickname already exists'
      );
    });

    it('should handle weak password error', async () => {
      mockApi.post.mockRejectedValue(new Error('Password too weak'));

      const { register } = useAuthStore.getState();
      await expect(register('new@example.com', '123', 'newuser')).rejects.toThrow(
        'Password too weak'
      );
    });

    it('should handle invalid email format', async () => {
      mockApi.post.mockRejectedValue(new Error('Invalid email format'));

      const { register } = useAuthStore.getState();
      await expect(register('invalid-email', 'password', 'newuser')).rejects.toThrow(
        'Invalid email format'
      );
    });
  });

  describe('initialize edge cases', () => {
    it('should handle failed user fetch after token refresh', async () => {
      localStorageMock.getItem.mockReturnValue('refresh-token');

      mockApi.post.mockResolvedValue({
        data: {
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
        },
      });

      mockApi.get.mockRejectedValue(new Error('User not found'));

      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle concurrent initialize calls', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { initialize } = useAuthStore.getState();

      // Call initialize multiple times concurrently
      await Promise.all([initialize(), initialize(), initialize()]);

      // Should only be initialized once
      expect(useAuthStore.getState().isInitialized).toBe(true);
    });
  });

  describe('logout edge cases', () => {
    it('should handle logout when not authenticated', async () => {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
      });

      mockApi.post.mockResolvedValue({ data: {} });

      const { logout } = useAuthStore.getState();
      await logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
