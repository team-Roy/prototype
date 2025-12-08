import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { PostType } from '@prisma/client';

export enum PostSortBy {
  RECENT = 'recent',
  POPULAR = 'popular',
  COMMENTS = 'comments',
}

export class PostListQueryDto {
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsEnum(PostSortBy)
  sortBy?: PostSortBy = PostSortBy.RECENT;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
