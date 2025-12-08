import { z } from 'zod';
import { PostType, Platform } from '../types/post';

export const createPostSchema = z.object({
  type: z.nativeEnum(PostType).default(PostType.TEXT),
  title: z.string().max(100, '제목은 최대 100자까지 가능합니다').optional(),
  content: z
    .string()
    .min(1, '내용을 입력해주세요')
    .max(10000, '내용은 최대 10000자까지 가능합니다'),
  tags: z.array(z.string().max(20)).max(10, '태그는 최대 10개까지 가능합니다').optional(),
  isAnonymous: z.boolean().default(false),
  mediaIds: z.array(z.string()).max(10, '미디어는 최대 10개까지 가능합니다').optional(),
  clipInfo: z
    .object({
      sourceUrl: z.string().url('올바른 URL 형식이 아닙니다'),
      platform: z.nativeEnum(Platform),
      startTime: z.number().optional(),
      endTime: z.number().optional(),
      creatorName: z.string().max(50).optional(),
    })
    .optional(),
});

export const updatePostSchema = z.object({
  title: z.string().max(100, '제목은 최대 100자까지 가능합니다').optional(),
  content: z.string().max(10000, '내용은 최대 10000자까지 가능합니다').optional(),
  tags: z.array(z.string().max(20)).max(10, '태그는 최대 10개까지 가능합니다').optional(),
});

export const postQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['recent', 'popular', 'comments']).default('recent'),
  type: z.nativeEnum(PostType).optional(),
  tag: z.string().optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PostQueryInput = z.infer<typeof postQuerySchema>;
