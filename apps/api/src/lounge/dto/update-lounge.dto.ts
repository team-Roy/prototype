import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class UpdateLoungeDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: '라운지 이름은 최소 2자 이상이어야 합니다' })
  @MaxLength(50, { message: '라운지 이름은 최대 50자까지 가능합니다' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '설명은 최대 500자까지 가능합니다' })
  description?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: '규칙은 최대 5000자까지 가능합니다' })
  rules?: string;
}
