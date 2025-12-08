import { IsString, IsInt, Min, Max, IsEnum } from 'class-validator';

export enum MediaFileType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

export class PresignedUrlDto {
  @IsString()
  fileName!: string;

  @IsString()
  contentType!: string;

  @IsEnum(MediaFileType)
  fileType!: MediaFileType;

  @IsInt()
  @Min(1)
  @Max(104857600) // 100MB max
  fileSize!: number;
}

export class PresignedUrlResponseDto {
  uploadUrl!: string;
  fileKey!: string;
  publicUrl!: string;
}
