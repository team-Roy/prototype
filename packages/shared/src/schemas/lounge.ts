import { z } from 'zod';

export const createLoungeSchema = z.object({
  name: z
    .string()
    .min(2, '라운지 이름은 최소 2자 이상이어야 합니다')
    .max(50, '라운지 이름은 최대 50자까지 가능합니다'),
  slug: z
    .string()
    .min(2, 'slug는 최소 2자 이상이어야 합니다')
    .max(50, 'slug는 최대 50자까지 가능합니다')
    .regex(/^[a-z0-9-]+$/, 'slug는 영문 소문자, 숫자, 하이픈만 사용 가능합니다')
    .optional(),
  description: z.string().max(500, '설명은 최대 500자까지 가능합니다').optional(),
});

export const updateLoungeSchema = z.object({
  name: z
    .string()
    .min(2, '라운지 이름은 최소 2자 이상이어야 합니다')
    .max(50, '라운지 이름은 최대 50자까지 가능합니다')
    .optional(),
  description: z.string().max(500, '설명은 최대 500자까지 가능합니다').optional(),
  coverImage: z.string().url('올바른 URL 형식이 아닙니다').optional(),
  icon: z.string().url('올바른 URL 형식이 아닙니다').optional(),
});

export const loungeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['popular', 'recent', 'name']).default('popular'),
  q: z.string().optional(),
});

export type CreateLoungeInput = z.infer<typeof createLoungeSchema>;
export type UpdateLoungeInput = z.infer<typeof updateLoungeSchema>;
export type LoungeQueryInput = z.infer<typeof loungeQuerySchema>;
