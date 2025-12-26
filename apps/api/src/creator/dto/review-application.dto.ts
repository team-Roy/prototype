import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum ReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ReviewApplicationDto {
  @IsEnum(ReviewAction, { message: '올바른 처리 유형이 아닙니다.' })
  @IsNotEmpty()
  action!: ReviewAction;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
