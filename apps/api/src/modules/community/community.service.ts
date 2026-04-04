import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommunityCommentDto, CreateCommunityPostDto, CreateCommunityReportDto } from './dto/community.dto';

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private assertEnabled(): void {
    if (this.configService.get<string>('COMMUNITY_MODULE_ENABLED') !== 'true') {
      throw new ServiceUnavailableException('Community layer is prebuilt and currently disabled by operator policy');
    }
  }

  listPosts() {
    this.assertEnabled();
    return this.prisma.communityPost.findMany({
      include: { author: true, comments: { include: { author: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  createPost(userId: string, payload: CreateCommunityPostDto) {
    this.assertEnabled();
    return this.prisma.communityPost.create({
      data: {
        authorId: userId,
        countryCode: 'QA',
        city: 'Doha',
        title: payload.title,
        content: payload.content,
      },
    });
  }

  createComment(userId: string, payload: CreateCommunityCommentDto) {
    this.assertEnabled();
    return this.prisma.communityComment.create({
      data: {
        authorId: userId,
        postId: payload.postId,
        content: payload.content,
      },
    });
  }

  createReport(userId: string, payload: CreateCommunityReportDto) {
    this.assertEnabled();
    return this.prisma.communityReport.create({
      data: {
        reporterId: userId,
        postId: payload.postId,
        reason: payload.reason,
      },
    });
  }
}