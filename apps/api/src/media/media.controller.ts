import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaService } from './media.service';
import { PresignedUrlDto, CompleteUploadDto } from './dto';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('presigned-url')
  async getPresignedUrl(@Body() dto: PresignedUrlDto) {
    return this.mediaService.getPresignedUrl(dto);
  }

  @Post('complete')
  async completeUpload(@Body() dto: CompleteUploadDto) {
    return this.mediaService.completeUpload(dto);
  }
}
