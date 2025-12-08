import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateLoungeDto {
  @IsString()
  @MinLength(2, { message: '라운지 이름은 최소 2자 이상이어야 합니다' })
  @MaxLength(50, { message: '라운지 이름은 최대 50자까지 가능합니다' })
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'slug는 최소 2자 이상이어야 합니다' })
  @MaxLength(50, { message: 'slug는 최대 50자까지 가능합니다' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug는 영문 소문자, 숫자, 하이픈만 사용 가능합니다',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '설명은 최대 500자까지 가능합니다' })
  description?: string;
}
