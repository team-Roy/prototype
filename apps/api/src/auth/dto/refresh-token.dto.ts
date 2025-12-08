import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @MinLength(1, { message: 'Refresh Token이 필요합니다.' })
  refreshToken!: string;
}
