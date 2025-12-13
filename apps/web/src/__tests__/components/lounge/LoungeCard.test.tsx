import { render, screen } from '@testing-library/react';
import { LoungeCard } from '@/components/lounge/LoungeCard';

const mockLounge = {
  id: 'lounge-1',
  name: '테스트 라운지',
  slug: 'test-lounge',
  description: '테스트 라운지 설명입니다.',
  icon: null,
  coverImage: null,
  isOfficial: false,
  memberCount: 1234,
  postCount: 567,
  createdAt: new Date().toISOString(),
  creator: {
    id: 'user-1',
    nickname: 'testuser',
    profileImage: null,
  },
};

describe('LoungeCard', () => {
  it('renders lounge name correctly', () => {
    render(<LoungeCard lounge={mockLounge} />);
    expect(screen.getByText('테스트 라운지')).toBeInTheDocument();
  });

  it('renders lounge description', () => {
    render(<LoungeCard lounge={mockLounge} />);
    expect(screen.getByText('테스트 라운지 설명입니다.')).toBeInTheDocument();
  });

  it('shows member and post counts', () => {
    render(<LoungeCard lounge={mockLounge} />);
    expect(screen.getByText(/멤버/)).toBeInTheDocument();
    expect(screen.getByText(/게시물/)).toBeInTheDocument();
  });

  it('displays first letter when no icon is provided', () => {
    render(<LoungeCard lounge={mockLounge} />);
    expect(screen.getByText('테')).toBeInTheDocument();
  });

  it('displays icon when provided', () => {
    const loungeWithIcon = {
      ...mockLounge,
      icon: 'https://example.com/icon.png',
    };
    render(<LoungeCard lounge={loungeWithIcon} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/icon.png');
  });

  it('shows official badge for official lounges', () => {
    const officialLounge = {
      ...mockLounge,
      isOfficial: true,
    };
    render(<LoungeCard lounge={officialLounge} />);
    expect(screen.getByText('공식')).toBeInTheDocument();
  });

  it('does not show official badge for non-official lounges', () => {
    render(<LoungeCard lounge={mockLounge} />);
    expect(screen.queryByText('공식')).not.toBeInTheDocument();
  });

  it('links to correct lounge page', () => {
    render(<LoungeCard lounge={mockLounge} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/lounge/test-lounge');
  });

  it('handles missing description gracefully', () => {
    const loungeWithoutDescription = {
      ...mockLounge,
      description: null as string | null,
    };
    render(<LoungeCard lounge={loungeWithoutDescription} />);
    expect(screen.getByText('테스트 라운지')).toBeInTheDocument();
  });

  it('handles very long lounge name gracefully', () => {
    const longNameLounge = {
      ...mockLounge,
      name: '이것은 매우 긴 라운지 이름입니다. 이렇게 긴 이름이 제대로 처리되는지 테스트합니다.',
    };
    render(<LoungeCard lounge={longNameLounge} />);
    expect(screen.getByText(longNameLounge.name)).toBeInTheDocument();
  });

  it('handles very long description gracefully', () => {
    const longDescLounge = {
      ...mockLounge,
      description: '이것은 매우 긴 설명입니다. '.repeat(20),
    };
    render(<LoungeCard lounge={longDescLounge} />);
    // 긴 설명이 표시되는지 확인 (일부만 확인)
    expect(screen.getByText(/이것은 매우 긴 설명입니다/)).toBeInTheDocument();
  });

  it('handles zero member and post counts', () => {
    const emptyLounge = {
      ...mockLounge,
      memberCount: 0,
      postCount: 0,
    };
    render(<LoungeCard lounge={emptyLounge} />);
    // There are multiple "0" values - verify both are present
    expect(screen.getAllByText(/0/).length).toBeGreaterThanOrEqual(2);
  });

  it('handles large member counts', () => {
    const popularLounge = {
      ...mockLounge,
      memberCount: 1000000,
      postCount: 500000,
    };
    render(<LoungeCard lounge={popularLounge} />);
    // 숫자가 포맷되거나 그대로 표시될 수 있음
    expect(screen.getByText(/멤버/)).toBeInTheDocument();
  });

  it('handles special characters in lounge name', () => {
    const specialNameLounge = {
      ...mockLounge,
      name: '<script>alert("xss")</script>',
      slug: 'special-lounge',
    };
    render(<LoungeCard lounge={specialNameLounge} />);
    // XSS 방지 - 텍스트로 렌더링되어야 함
    expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
  });

  it('handles empty string name (edge case)', () => {
    const emptyNameLounge = {
      ...mockLounge,
      name: '',
    };
    render(<LoungeCard lounge={emptyNameLounge} />);
    // 빈 이름은 빈 문자열의 첫 글자(없음)를 표시하려 함
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
  });

  it('handles Korean characters in slug correctly', () => {
    const koreanSlugLounge = {
      ...mockLounge,
      slug: '테스트-라운지-슬러그',
    };
    render(<LoungeCard lounge={koreanSlugLounge} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/lounge/테스트-라운지-슬러그');
  });
});
