import { api } from './api';

export type SearchType = 'all' | 'lounge' | 'post';

export interface LoungeSearchResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  memberCount: number;
  isOfficial: boolean;
}

export interface PostSearchResult {
  id: string;
  title: string | null;
  content: string;
  type: string;
  author: { nickname: string };
  lounge: { name: string; slug: string };
  upvoteCount: number;
  commentCount: number;
  createdAt: string;
}

export interface SearchResponse {
  query: string;
  type: SearchType;
  results: {
    lounges: {
      items: LoungeSearchResult[];
      total: number;
    };
    posts: {
      items: PostSearchResult[];
      total: number;
    };
  };
}

export interface SearchParams {
  q: string;
  type?: SearchType;
  page?: number;
  limit?: number;
}

export const searchApi = {
  search: async (params: SearchParams) => {
    const response = await api.get<{ data: SearchResponse }>('/search', { params });
    return response.data.data;
  },

  getTags: async (q?: string) => {
    const response = await api.get<{ data: string[] }>('/search/tags', { params: { q } });
    return response.data.data;
  },
};

// Local storage helpers for recent searches
const RECENT_SEARCHES_KEY = 'fandom-lounge-recent-searches';
const MAX_RECENT_SEARCHES = 10;

export const getRecentSearches = (): string[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const addRecentSearch = (query: string): void => {
  if (typeof window === 'undefined' || !query.trim()) return;
  const searches = getRecentSearches();
  const filtered = searches.filter((s) => s !== query);
  const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
};

export const clearRecentSearches = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RECENT_SEARCHES_KEY);
};
