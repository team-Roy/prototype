import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class BanUserDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;
}
