'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { voteApi, VoteType } from '@/lib/vote';
import { useAuthStore } from '@/stores/authStore';
import { formatNumber } from '@fandom/shared';

interface VoteButtonsProps {
  type: 'post' | 'comment';
  targetId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  initialUserVote?: VoteType | null;
  size?: 'sm' | 'default';
}

export function VoteButtons({
  type,
  targetId,
  initialUpvotes,
  initialDownvotes,
  initialUserVote = null,
  size = 'default',
}: VoteButtonsProps) {
  const { isAuthenticated } = useAuthStore();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<VoteType | null>(initialUserVote);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (voteType: VoteType) => {
    if (!isAuthenticated || isVoting) return;

    // Optimistic update
    const prevUpvotes = upvotes;
    const prevDownvotes = downvotes;
    const prevUserVote = userVote;

    if (userVote === voteType) {
      // Toggle off
      setUserVote(null);
      if (voteType === 'UPVOTE') {
        setUpvotes((prev) => prev - 1);
      } else {
        setDownvotes((prev) => prev - 1);
      }
    } else {
      // New vote or change vote
      if (userVote) {
        // Change vote
        if (voteType === 'UPVOTE') {
          setUpvotes((prev) => prev + 1);
          setDownvotes((prev) => prev - 1);
        } else {
          setUpvotes((prev) => prev - 1);
          setDownvotes((prev) => prev + 1);
        }
      } else {
        // New vote
        if (voteType === 'UPVOTE') {
          setUpvotes((prev) => prev + 1);
        } else {
          setDownvotes((prev) => prev + 1);
        }
      }
      setUserVote(voteType);
    }

    try {
      setIsVoting(true);
      const response =
        type === 'post'
          ? await voteApi.votePost(targetId, voteType)
          : await voteApi.voteComment(targetId, voteType);

      // Sync with server response
      setUpvotes(response.upvoteCount);
      setDownvotes(response.downvoteCount);
      setUserVote(response.userVote);
    } catch (error) {
      // Rollback on error
      setUpvotes(prevUpvotes);
      setDownvotes(prevDownvotes);
      setUserVote(prevUserVote);
      console.error('Vote failed:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const buttonSize = size === 'sm' ? 'sm' : 'default';
  const iconClass = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={userVote === 'UPVOTE' ? 'default' : 'outline'}
        size={buttonSize}
        onClick={() => handleVote('UPVOTE')}
        disabled={!isAuthenticated || isVoting}
        className={userVote === 'UPVOTE' ? 'bg-green-600 hover:bg-green-700' : ''}
      >
        <span className={iconClass}>👍</span>
        <span className="ml-1">{formatNumber(upvotes)}</span>
      </Button>
      <Button
        variant={userVote === 'DOWNVOTE' ? 'default' : 'outline'}
        size={buttonSize}
        onClick={() => handleVote('DOWNVOTE')}
        disabled={!isAuthenticated || isVoting}
        className={userVote === 'DOWNVOTE' ? 'bg-red-600 hover:bg-red-700' : ''}
      >
        <span className={iconClass}>👎</span>
        <span className="ml-1">{formatNumber(downvotes)}</span>
      </Button>
    </div>
  );
}
