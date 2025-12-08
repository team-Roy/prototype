import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @Matches(/[A-Za-z]/, { message: '비밀번호에 영문자가 포함되어야 합니다.' })
  @Matches(/[0-9]/, { message: '비밀번호에 숫자가 포함되어야 합니다.' })
  password!: string;

  @IsString()
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' })
  @MaxLength(20, { message: '닉네임은 최대 20자까지 가능합니다.' })
  @Matches(/^[가-힣a-zA-Z0-9_]+$/, {
    message: '닉네임은 한글, 영문, 숫자, 밑줄만 사용 가능합니다.',
  })
  nickname!: string;
}
