import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateCreatorPickDto {
  @ApiProperty({ description: '픽할 게시글 ID' })
  @IsString()
  postId!: string;

  @ApiPropertyOptional({ description: '크리에이터 코멘트', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class UpdateCreatorPickDto {
  @ApiPropertyOptional({ description: '크리에이터 코멘트', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class CreatorPickResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  loungeId!: string;

  @ApiProperty()
  postId!: string;

  @ApiProperty()
  pickedBy!: string;

  @ApiPropertyOptional()
  comment?: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class CreatorPickWithPostDto extends CreatorPickResponseDto {
  @ApiProperty()
  post!: {
    id: string;
    title: string | null;
    content: string;
    type: string;
    authorId: string;
    author: {
      id: string;
      nickname: string;
      profileImage: string | null;
    };
    upvoteCount: number;
    commentCount: number;
    createdAt: Date;
  };
}

export class CreatorPickListResponseDto {
  @ApiProperty({ type: [CreatorPickWithPostDto] })
  picks!: CreatorPickWithPostDto[];

  @ApiProperty()
  totalCount!: number;
}
