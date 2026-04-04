import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateCommunityCommentDto, CreateCommunityPostDto, CreateCommunityReportDto } from './dto/community.dto';
import { CommunityService } from './community.service';

@ApiTags('community')
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('posts')
  listPosts() {
    return this.communityService.listPosts();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant', 'admin', 'command-center')
  @Post('posts')
  createPost(@CurrentUser() user: { id: string }, @Body() payload: CreateCommunityPostDto) {
    return this.communityService.createPost(user.id, payload);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('comments')
  createComment(@CurrentUser() user: { id: string }, @Body() payload: CreateCommunityCommentDto) {
    return this.communityService.createComment(user.id, payload);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('reports')
  createReport(@CurrentUser() user: { id: string }, @Body() payload: CreateCommunityReportDto) {
    return this.communityService.createReport(user.id, payload);
  }
}