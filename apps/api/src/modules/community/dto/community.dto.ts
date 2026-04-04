import { IsString } from 'class-validator';

export class CreateCommunityPostDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;
}

export class CreateCommunityCommentDto {
  @IsString()
  postId!: string;

  @IsString()
  content!: string;
}

export class CreateCommunityReportDto {
  @IsString()
  postId!: string;

  @IsString()
  reason!: string;
}