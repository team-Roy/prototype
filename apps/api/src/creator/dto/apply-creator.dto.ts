import { IsString, IsNotEmpty, IsOptional, MaxLength, IsUrl, IsArray } from 'class-validator';

export class ApplyCreatorDto {
  @IsString()
  @IsNotEmpty({ message: '활동명을 입력해주세요.' })
  @MaxLength(50, { message: '활동명은 50자 이내로 입력해주세요.' })
  stageName!: string;

  @IsString()
  @IsNotEmpty({ message: '카테고리를 입력해주세요.' })
  @MaxLength(50, { message: '카테고리는 50자 이내로 입력해주세요.' })
  category!: string;

  @IsString()
  @IsNotEmpty({ message: '자기소개를 입력해주세요.' })
  @MaxLength(1000, { message: '자기소개는 1000자 이내로 입력해주세요.' })
  description!: string;

  @IsUrl({}, { message: '올바른 URL 형식이 아닙니다.' })
  @IsOptional()
  portfolioUrl?: string;

  @IsArray()
  @IsOptional()
  socialLinks?: string[];
}
