import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, '댓글 내용을 입력해주세요')
    .max(1000, '댓글은 최대 1000자까지 가능합니다'),
  isAnonymous: z.boolean().default(false),
  parentId: z.string().optional(),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, '댓글 내용을 입력해주세요')
    .max(1000, '댓글은 최대 1000자까지 가능합니다'),
});

export const commentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sort: z.enum(['recent', 'popular']).default('recent'),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CommentQueryInput = z.infer<typeof commentQuerySchema>;
