import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PublicServicesIntegrationService } from './public-services-integration.service';

@ApiTags('public-services-integration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('public-services-integration')
export class PublicServicesIntegrationController {
  constructor(private readonly publicServicesIntegrationService: PublicServicesIntegrationService) {}

  @Post('requests')
  @Roles('tenant', 'admin', 'command-center')
  createRequest(
    @CurrentUser() user: { id: string },
    @Body() body: {
      serviceType: 'address-verification' | 'residency-registration' | 'lease-validation' | 'municipality-request' | 'utilities-integration';
      countryCode: string;
      city: string;
      assetId?: string;
      requiresConsent: boolean;
      consentAccepted: boolean;
      authorityCode?: string;
      data: Record<string, unknown>;
    },
  ) {
    return this.publicServicesIntegrationService.createRequest(user.id, body);
  }

  @Get('requests')
  @Roles('admin', 'command-center')
  listRequests(@Query() query: { countryCode?: string; serviceType?: string; assetId?: string; status?: string }) {
    return this.publicServicesIntegrationService.listRequests(query);
  }

  @Post('requests/:id/approve')
  @Roles('admin', 'command-center')
  approveRequest(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.publicServicesIntegrationService.approveRequest(user.id, id);
  }
}