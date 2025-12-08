import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ManagerRole } from '@prisma/client';

export class AddManagerDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsEnum(ManagerRole)
  role?: ManagerRole = ManagerRole.MANAGER;
}
