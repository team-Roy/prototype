import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommentItem } from '@/components/comment/CommentItem';
import { useAuthStore } from '@/stores/authStore';

// Mock auth store
jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn(),
}));

// Mock window.confirm
const mockConfirm = jest.fn();
window.confirm = mockConfirm;

describe('CommentItem', () => {
  const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

  const mockComment = {
    id: 'comment-1',
    content: '테스트 댓글입니다.',
    isAnonymous: false,
    isDeleted: false,
    author: {
      id: 'user-1',
      nickname: 'testuser',
      profileImage: null,
    },
    upvoteCount: 5,
    downvoteCount: 1,
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
      initialize: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      setUser: jest.fn(),
    });
  });

  it('renders comment content correctly', () => {
    render(<CommentItem comment={mockComment} />);

    expect(screen.getByText('테스트 댓글입니다.')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('displays author avatar with first letter when no profile image', () => {
    render(<CommentItem comment={mockComment} />);

    expect(screen.getByText('t')).toBeInTheDocument();
  });

  it('displays profile image when available', () => {
    const commentWithImage = {
      ...mockComment,
      author: {
        ...mockComment.author,
        profileImage: 'https://example.com/avatar.png',
      },
    };

    render(<CommentItem comment={commentWithImage} />);

    // img with alt="" has role="presentation", so query by selector
    const img = document.querySelector('img[src="https://example.com/avatar.png"]');
    expect(img).toBeInTheDocument();
  });

  it('shows vote counts', () => {
    render(<CommentItem comment={mockComment} />);

    expect(screen.getByText('👍 5')).toBeInTheDocument();
    expect(screen.getByText('👎 1')).toBeInTheDocument();
  });

  it('shows reply button for non-reply comments', () => {
    const onReply = jest.fn();
    render(<CommentItem comment={mockComment} onReply={onReply} />);

    expect(screen.getByRole('button', { name: /답글/i })).toBeInTheDocument();
  });

  it('hides reply button for reply comments', () => {
    const onReply = jest.fn();
    render(<CommentItem comment={mockComment} onReply={onReply} isReply />);

    expect(screen.queryByRole('button', { name: /답글/i })).not.toBeInTheDocument();
  });

  it('shows edit and delete buttons for author', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        nickname: 'testuser',
        profileImage: null,
        role: 'USER',
      },
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      initialize: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      setUser: jest.fn(),
    });

    const onEdit = jest.fn();
    const onDelete = jest.fn();

    render(<CommentItem comment={mockComment} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.getByRole('button', { name: /수정/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /삭제/i })).toBeInTheDocument();
  });

  it('hides edit and delete buttons for non-author', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: 'user-2',
        email: 'other@example.com',
        nickname: 'otheruser',
        profileImage: null,
        role: 'USER',
      },
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      initialize: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      setUser: jest.fn(),
    });

    const onEdit = jest.fn();
    const onDelete = jest.fn();

    render(<CommentItem comment={mockComment} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.queryByRole('button', { name: /수정/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /삭제/i })).not.toBeInTheDocument();
  });

  it('handles delete with confirmation', async () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        nickname: 'testuser',
        profileImage: null,
        role: 'USER',
      },
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      initialize: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      setUser: jest.fn(),
    });

    const onDelete = jest.fn().mockResolvedValue(undefined);
    mockConfirm.mockReturnValue(true);

    render(<CommentItem comment={mockComment} onDelete={onDelete} />);

    const deleteButton = screen.getByRole('button', { name: /삭제/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
      expect(onDelete).toHaveBeenCalledWith('comment-1');
    });
  });

  it('cancels delete when confirmation is rejected', async () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        nickname: 'testuser',
        profileImage: null,
        role: 'USER',
      },
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      initialize: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      setUser: jest.fn(),
    });

    const onDelete = jest.fn();
    mockConfirm.mockReturnValue(false);

    render(<CommentItem comment={mockComment} onDelete={onDelete} />);

    const deleteButton = screen.getByRole('button', { name: /삭제/i });
    fireEvent.click(deleteButton);

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('shows deleted message for deleted comments', () => {
    const deletedComment = {
      ...mockComment,
      isDeleted: true,
      content: '삭제된 댓글입니다',
    };

    render(<CommentItem comment={deletedComment} />);

    expect(screen.getByText('삭제된 댓글입니다')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /수정/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /삭제/i })).not.toBeInTheDocument();
  });

  it('hides edit button for anonymous comments', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        nickname: 'testuser',
        profileImage: null,
        role: 'USER',
      },
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      initialize: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      setUser: jest.fn(),
    });

    const anonymousComment = {
      ...mockComment,
      isAnonymous: true,
      author: {
        id: null as unknown as string,
        nickname: '익명',
        profileImage: null,
      },
    };

    render(<CommentItem comment={anonymousComment} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.queryByRole('button', { name: /수정/i })).not.toBeInTheDocument();
  });

  it('renders replies correctly', () => {
    const commentWithReplies = {
      ...mockComment,
      replies: [
        {
          id: 'reply-1',
          content: '답글입니다.',
          isAnonymous: false,
          isDeleted: false,
          author: {
            id: 'user-2',
            nickname: 'replier',
            profileImage: null,
          },
          upvoteCount: 2,
          downvoteCount: 0,
          parentId: 'comment-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    render(<CommentItem comment={commentWithReplies} />);

    expect(screen.getByText('답글입니다.')).toBeInTheDocument();
    expect(screen.getByText('replier')).toBeInTheDocument();
  });

  it('shows edited indicator when comment was updated', () => {
    const editedComment = {
      ...mockComment,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    };

    render(<CommentItem comment={editedComment} />);

    expect(screen.getByText('(수정됨)')).toBeInTheDocument();
  });
});
