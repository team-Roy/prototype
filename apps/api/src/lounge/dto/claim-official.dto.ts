import { IsString, IsOptional } from 'class-validator';

export class ClaimOfficialDto {
  @IsString()
  loungeId!: string;

  @IsOptional()
  @IsString()
  message?: string; // 인증 요청 메시지 (선택)
}
