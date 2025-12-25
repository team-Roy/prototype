import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: '토큰이 필요합니다.' })
  token!: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @Matches(/[A-Za-z]/, { message: '비밀번호에 영문자가 포함되어야 합니다.' })
  @Matches(/[0-9]/, { message: '비밀번호에 숫자가 포함되어야 합니다.' })
  newPassword!: string;
}
