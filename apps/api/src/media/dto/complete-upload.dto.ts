import { IsString, IsInt, IsOptional, IsEnum } from 'class-validator';
import { MediaFileType } from './presigned-url.dto';

export class CompleteUploadDto {
  @IsString()
  fileKey!: string;

  @IsEnum(MediaFileType)
  fileType!: MediaFileType;

  @IsOptional()
  @IsInt()
  width?: number;

  @IsOptional()
  @IsInt()
  height?: number;

  @IsOptional()
  @IsInt()
  duration?: number; // video duration in seconds

  @IsOptional()
  @IsInt()
  fileSize?: number;
}
