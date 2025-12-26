import { IsString, IsNotEmpty, IsOptional, MaxLength, IsUrl } from 'class-validator';

export class ApplyCreatorDto {
  @IsString()
  @IsNotEmpty({ message: '활동명을 입력해주세요.' })
  @MaxLength(50, { message: '활동명은 50자 이내로 입력해주세요.' })
  creatorName!: string;

  @IsUrl({}, { message: '올바른 URL 형식이 아닙니다.' })
  @IsNotEmpty({ message: '채널 URL을 입력해주세요.' })
  channelUrl!: string;

  @IsString()
  @IsNotEmpty({ message: '채널 유형을 선택해주세요.' })
  channelType!: string; // youtube, twitch, afreeca, etc.

  @IsString()
  @IsOptional()
  followerCount?: string;

  @IsString()
  @IsNotEmpty({ message: '자기소개를 입력해주세요.' })
  @MaxLength(1000, { message: '자기소개는 1000자 이내로 입력해주세요.' })
  introduction!: string;
}
