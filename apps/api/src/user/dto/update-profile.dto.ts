import { IsString, MinLength, MaxLength, Matches, IsOptional, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' })
  @MaxLength(20, { message: '닉네임은 최대 20자까지 가능합니다.' })
  @Matches(/^[가-힣a-zA-Z0-9_]+$/, {
    message: '닉네임은 한글, 영문, 숫자, 밑줄만 사용 가능합니다.',
  })
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '자기소개는 최대 200자까지 가능합니다.' })
  bio?: string;

  @IsOptional()
  @IsUrl({}, { message: '올바른 URL 형식이 아닙니다.' })
  profileImage?: string;
}
