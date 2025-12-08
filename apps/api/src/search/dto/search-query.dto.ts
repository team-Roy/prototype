import { IsString, IsOptional, IsEnum, MinLength, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum SearchType {
  ALL = 'all',
  LOUNGE = 'lounge',
  POST = 'post',
}

export class SearchQueryDto {
  @IsString()
  @MinLength(1)
  q!: string;

  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType = SearchType.ALL;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class TagSearchQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 10;
}
