import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { PresignedUrlDto, MediaFileType, CompleteUploadDto } from './dto';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

@Injectable()
export class MediaService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION') || 'ap-northeast-2';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || 'fandom-lounge-media';
    this.publicUrl =
      this.configService.get<string>('S3_PUBLIC_URL') ||
      `https://${this.bucketName}.s3.${region}.amazonaws.com`;

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  async getPresignedUrl(dto: PresignedUrlDto) {
    // Validate content type
    if (dto.fileType === MediaFileType.IMAGE) {
      if (!ALLOWED_IMAGE_TYPES.includes(dto.contentType)) {
        throw new BadRequestException(
          '허용되지 않는 이미지 형식입니다. jpg, png, gif, webp만 허용됩니다.'
        );
      }
      if (dto.fileSize > MAX_IMAGE_SIZE) {
        throw new BadRequestException('이미지 크기는 10MB를 초과할 수 없습니다.');
      }
    } else if (dto.fileType === MediaFileType.VIDEO) {
      if (!ALLOWED_VIDEO_TYPES.includes(dto.contentType)) {
        throw new BadRequestException('허용되지 않는 비디오 형식입니다. mp4, webm만 허용됩니다.');
      }
      if (dto.fileSize > MAX_VIDEO_SIZE) {
        throw new BadRequestException('비디오 크기는 100MB를 초과할 수 없습니다.');
      }
    }

    // Generate unique file key
    const extension = this.getExtension(dto.contentType);
    const folder = dto.fileType === MediaFileType.IMAGE ? 'images' : 'videos';
    const date = new Date().toISOString().split('T')[0];
    const fileKey = `${folder}/${date}/${uuidv4()}.${extension}`;

    // Generate presigned URL
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
      ContentType: dto.contentType,
      ContentLength: dto.fileSize,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

    return {
      uploadUrl,
      fileKey,
      publicUrl: `${this.publicUrl}/${fileKey}`,
    };
  }

  async completeUpload(dto: CompleteUploadDto) {
    // Generate thumbnail URL for images
    let thumbnailUrl: string | undefined;
    if (dto.fileType === MediaFileType.IMAGE) {
      // For now, use the same URL as thumbnail
      // In production, you might use Cloudflare Image Resizing
      thumbnailUrl = `${this.publicUrl}/${dto.fileKey}`;
    }

    return {
      url: `${this.publicUrl}/${dto.fileKey}`,
      thumbnailUrl,
      fileKey: dto.fileKey,
      type: dto.fileType,
      width: dto.width,
      height: dto.height,
      duration: dto.duration,
      fileSize: dto.fileSize,
    };
  }

  private getExtension(contentType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
    };
    return map[contentType] || 'bin';
  }
}
