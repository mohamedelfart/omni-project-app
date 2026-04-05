import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantIntelligenceService } from './tenant-intelligence.service';

@ApiTags('tenant-intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenant-intelligence')
export class TenantIntelligenceController {
  constructor(private readonly tenantIntelligenceService: TenantIntelligenceService) {}

  @Get('recommendations')
  getRecommendations(
    @CurrentUser() user: { id: string },
    @Query('countryCode') countryCode?: string,
  ) {
    return this.tenantIntelligenceService.getRecommendations(user.id, countryCode);
  }
}
