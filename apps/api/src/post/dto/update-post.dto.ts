import { IsString, IsOptional, IsArray, MaxLength, MinLength } from 'class-validator';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: '제목은 최소 2자 이상이어야 합니다' })
  @MaxLength(100, { message: '제목은 최대 100자까지 가능합니다' })
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: '내용을 입력해주세요' })
  @MaxLength(10000, { message: '내용은 최대 10000자까지 가능합니다' })
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
