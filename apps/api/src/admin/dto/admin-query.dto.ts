import { IsOptional, IsInt, Min, Max, IsString, IsBoolean, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum AdminUserSortBy {
  RECENT = 'recent',
  EMAIL = 'email',
  NICKNAME = 'nickname',
}

export enum AdminLoungeSortBy {
  RECENT = 'recent',
  NAME = 'name',
  MEMBERS = 'members',
  POSTS = 'posts',
}

export class AdminUserListQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(AdminUserSortBy)
  sortBy?: AdminUserSortBy = AdminUserSortBy.RECENT;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class AdminLoungeListQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isOfficial?: boolean;

  @IsOptional()
  @IsEnum(AdminLoungeSortBy)
  sortBy?: AdminLoungeSortBy = AdminLoungeSortBy.RECENT;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
