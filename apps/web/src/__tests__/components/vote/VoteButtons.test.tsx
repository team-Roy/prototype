import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoteButtons } from '@/components/vote/VoteButtons';
import { voteApi } from '@/lib/vote';
import { useAuthStore } from '@/stores/authStore';

// Mock the vote API
jest.mock('@/lib/vote', () => ({
  voteApi: {
    votePost: jest.fn(),
    voteComment: jest.fn(),
  },
}));

// Mock the auth store
jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn(),
}));

describe('VoteButtons', () => {
  const mockVoteApi = voteApi as jest.Mocked<typeof voteApi>;
  const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      user: null,
      accessToken: null,
      login: jest.fn(),
      logout: jest.fn(),
      setUser: jest.fn(),
    });
  });

  it('renders upvote and downvote buttons', () => {
    render(<VoteButtons type="post" targetId="post-1" initialUpvotes={10} initialDownvotes={2} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('disables buttons when not authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      login: jest.fn(),
      logout: jest.fn(),
      setUser: jest.fn(),
    });

    render(<VoteButtons type="post" targetId="post-1" initialUpvotes={10} initialDownvotes={2} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('handles upvote click with optimistic update', async () => {
    mockVoteApi.votePost.mockResolvedValue({
      upvoteCount: 11,
      downvoteCount: 2,
      userVote: 'UPVOTE',
    });

    render(<VoteButtons type="post" targetId="post-1" initialUpvotes={10} initialDownvotes={2} />);

    const upvoteButton = screen.getAllByRole('button')[0];
    fireEvent.click(upvoteButton);

    // Optimistic update should show immediately
    expect(screen.getByText('11')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockVoteApi.votePost).toHaveBeenCalledWith('post-1', 'UPVOTE');
    });
  });

  it('handles downvote click', async () => {
    mockVoteApi.votePost.mockResolvedValue({
      upvoteCount: 10,
      downvoteCount: 3,
      userVote: 'DOWNVOTE',
    });

    render(<VoteButtons type="post" targetId="post-1" initialUpvotes={10} initialDownvotes={2} />);

    const downvoteButton = screen.getAllByRole('button')[1];
    fireEvent.click(downvoteButton);

    await waitFor(() => {
      expect(mockVoteApi.votePost).toHaveBeenCalledWith('post-1', 'DOWNVOTE');
    });
  });

  it('toggles vote off when clicking same vote type', async () => {
    mockVoteApi.votePost.mockResolvedValue({
      upvoteCount: 9,
      downvoteCount: 2,
      userVote: null,
    });

    render(
      <VoteButtons
        type="post"
        targetId="post-1"
        initialUpvotes={10}
        initialDownvotes={2}
        initialUserVote="UPVOTE"
      />
    );

    const upvoteButton = screen.getAllByRole('button')[0];
    fireEvent.click(upvoteButton);

    await waitFor(() => {
      expect(mockVoteApi.votePost).toHaveBeenCalledWith('post-1', 'UPVOTE');
    });
  });

  it('calls comment vote API for comment type', async () => {
    mockVoteApi.voteComment.mockResolvedValue({
      upvoteCount: 6,
      downvoteCount: 1,
      userVote: 'UPVOTE',
    });

    render(
      <VoteButtons type="comment" targetId="comment-1" initialUpvotes={5} initialDownvotes={1} />
    );

    const upvoteButton = screen.getAllByRole('button')[0];
    fireEvent.click(upvoteButton);

    await waitFor(() => {
      expect(mockVoteApi.voteComment).toHaveBeenCalledWith('comment-1', 'UPVOTE');
    });
  });

  it('rolls back on API error', async () => {
    mockVoteApi.votePost.mockRejectedValue(new Error('API Error'));

    render(<VoteButtons type="post" targetId="post-1" initialUpvotes={10} initialDownvotes={2} />);

    const upvoteButton = screen.getAllByRole('button')[0];
    fireEvent.click(upvoteButton);

    // Should rollback to original value
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  it('applies correct styling for active upvote', () => {
    render(
      <VoteButtons
        type="post"
        targetId="post-1"
        initialUpvotes={10}
        initialDownvotes={2}
        initialUserVote="UPVOTE"
      />
    );

    const upvoteButton = screen.getAllByRole('button')[0];
    expect(upvoteButton).toHaveClass('bg-green-600');
  });

  it('applies correct styling for active downvote', () => {
    render(
      <VoteButtons
        type="post"
        targetId="post-1"
        initialUpvotes={10}
        initialDownvotes={2}
        initialUserVote="DOWNVOTE"
      />
    );

    const downvoteButton = screen.getAllByRole('button')[1];
    expect(downvoteButton).toHaveClass('bg-red-600');
  });

  it('renders with small size', () => {
    render(
      <VoteButtons
        type="post"
        targetId="post-1"
        initialUpvotes={10}
        initialDownvotes={2}
        size="sm"
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveClass('h-9');
    });
  });

  it('handles vote change from upvote to downvote', async () => {
    mockVoteApi.votePost.mockResolvedValue({
      upvoteCount: 9,
      downvoteCount: 3,
      userVote: 'DOWNVOTE',
    });

    render(
      <VoteButtons
        type="post"
        targetId="post-1"
        initialUpvotes={10}
        initialDownvotes={2}
        initialUserVote="UPVOTE"
      />
    );

    const downvoteButton = screen.getAllByRole('button')[1];
    fireEvent.click(downvoteButton);

    await waitFor(() => {
      expect(mockVoteApi.votePost).toHaveBeenCalledWith('post-1', 'DOWNVOTE');
    });
  });

  it('handles vote change from downvote to upvote', async () => {
    mockVoteApi.votePost.mockResolvedValue({
      upvoteCount: 11,
      downvoteCount: 1,
      userVote: 'UPVOTE',
    });

    render(
      <VoteButtons
        type="post"
        targetId="post-1"
        initialUpvotes={10}
        initialDownvotes={2}
        initialUserVote="DOWNVOTE"
      />
    );

    const upvoteButton = screen.getAllByRole('button')[0];
    fireEvent.click(upvoteButton);

    await waitFor(() => {
      expect(mockVoteApi.votePost).toHaveBeenCalledWith('post-1', 'UPVOTE');
    });
  });

  it('prevents multiple simultaneous votes', async () => {
    let resolveFirst: (value: {
      upvoteCount: number;
      downvoteCount: number;
      userVote: 'UPVOTE' | 'DOWNVOTE' | null;
    }) => void;
    mockVoteApi.votePost.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        })
    );

    render(<VoteButtons type="post" targetId="post-1" initialUpvotes={10} initialDownvotes={2} />);

    const upvoteButton = screen.getAllByRole('button')[0];
    const downvoteButton = screen.getAllByRole('button')[1];

    // First click
    fireEvent.click(upvoteButton);
    // Second click while first is in progress - should be ignored
    fireEvent.click(downvoteButton);

    resolveFirst!({ upvoteCount: 11, downvoteCount: 2, userVote: 'UPVOTE' });

    await waitFor(() => {
      // Only one vote should be registered
      expect(mockVoteApi.votePost).toHaveBeenCalledTimes(1);
    });
  });

  it('handles zero votes correctly', () => {
    render(<VoteButtons type="post" targetId="post-1" initialUpvotes={0} initialDownvotes={0} />);

    // There should be two "0" texts
    expect(screen.getAllByText('0')).toHaveLength(2);
  });

  it('formats large numbers', () => {
    render(
      <VoteButtons type="post" targetId="post-1" initialUpvotes={1500} initialDownvotes={2000} />
    );

    // formatNumber uses Korean units: 천, 만, 억
    expect(screen.getByText('1.5천')).toBeInTheDocument();
    expect(screen.getByText('2.0천')).toBeInTheDocument();
  });

  it('syncs with server response after vote', async () => {
    // Server returns different count than optimistic update
    mockVoteApi.votePost.mockResolvedValue({
      upvoteCount: 15, // Different from optimistic (11)
      downvoteCount: 2,
      userVote: 'UPVOTE',
    });

    render(<VoteButtons type="post" targetId="post-1" initialUpvotes={10} initialDownvotes={2} />);

    const upvoteButton = screen.getAllByRole('button')[0];
    fireEvent.click(upvoteButton);

    // Optimistic update shows 11
    expect(screen.getByText('11')).toBeInTheDocument();

    // After API response, should sync to 15
    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });
});
