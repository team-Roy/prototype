import { api } from './api';

export interface CreatorApplicationData {
  stageName: string;
  category: string;
  description: string;
  portfolioUrl?: string;
  socialLinks?: string[];
}

export interface CreatorApplication {
  id: string;
  userId: string;
  stageName: string;
  category: string;
  description: string;
  portfolioUrl?: string;
  socialLinks?: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const creatorApi = {
  apply: async (data: CreatorApplicationData): Promise<CreatorApplication> => {
    const response = await api.post('/creator/apply', data);
    return response.data.data;
  },

  getMyApplications: async (): Promise<CreatorApplication[]> => {
    const response = await api.get('/creator/my-applications');
    return response.data.data;
  },
};
