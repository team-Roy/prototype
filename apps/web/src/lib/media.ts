import { api } from './api';

export type MediaFileType = 'IMAGE' | 'VIDEO';

export interface PresignedUrlRequest {
  fileName: string;
  contentType: string;
  fileType: MediaFileType;
  fileSize: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

export interface CompleteUploadRequest {
  fileKey: string;
  fileType: MediaFileType;
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
}

export interface MediaInfo {
  url: string;
  thumbnailUrl?: string;
  fileKey: string;
  type: MediaFileType;
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
}

export const mediaApi = {
  getPresignedUrl: async (data: PresignedUrlRequest) => {
    const response = await api.post<{ data: PresignedUrlResponse }>('/media/presigned-url', data);
    return response.data.data;
  },

  completeUpload: async (data: CompleteUploadRequest) => {
    const response = await api.post<{ data: MediaInfo }>('/media/complete', data);
    return response.data.data;
  },
};

// Utility functions
export const getFileType = (file: File): MediaFileType => {
  if (file.type.startsWith('video/')) {
    return 'VIDEO';
  }
  return 'IMAGE';
};

export const isValidFileType = (file: File): boolean => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
  ];
  return allowedTypes.includes(file.type);
};

export const getMaxFileSize = (fileType: MediaFileType): number => {
  return fileType === 'VIDEO' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
