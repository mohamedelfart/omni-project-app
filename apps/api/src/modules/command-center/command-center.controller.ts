import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PropertyCommandService } from '../properties/property-command.service';
import { CommandCenterService } from './command-center.service';

@ApiTags('command-center')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'command-center')
@Controller('command-center')
export class CommandCenterController {
  constructor(
    private readonly commandCenterService: CommandCenterService,
    private readonly propertyCommandService: PropertyCommandService,
  ) {}

  @Get('dashboard')
  getDashboard(@Query() query: { countryCode?: string; startDate?: string; endDate?: string; assetId?: string; serviceType?: string; status?: string; vendorId?: string }) {
    return this.commandCenterService.getDashboard(query);
  }

  @Get('requests')
  listRequests(@Query() query: { countryCode?: string; startDate?: string; endDate?: string; assetId?: string; serviceType?: string; status?: string; vendorId?: string }) {
    return this.commandCenterService.listRequests(query);
  }

  @Get('operations')
  operations(@Query() query: { countryCode?: string; startDate?: string; endDate?: string; assetId?: string; serviceType?: string; status?: string; vendorId?: string }) {
    return this.commandCenterService.getOperationsLayer(query);
  }

  @Get('analysis')
  analysis(@Query() query: { countryCode?: string; startDate?: string; endDate?: string; assetId?: string; serviceType?: string; status?: string; vendorId?: string }) {
    return this.commandCenterService.getAnalysisLayer(query);
  }

  @Get('reports')
  reports(@Query() query: { countryCode?: string; startDate?: string; endDate?: string; assetId?: string; serviceType?: string; status?: string; vendorId?: string }) {
    return this.commandCenterService.getReportingLayer(query);
  }

  @Get('recommendations')
  recommendations(@Query() query: { countryCode?: string; startDate?: string; endDate?: string; assetId?: string; serviceType?: string; status?: string; vendorId?: string }) {
    return this.commandCenterService.getDecisionSupportLayer(query);
  }

  @Post('requests/:id/assign-provider')
  assignProvider(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: { providerId: string },
  ) {
    return this.commandCenterService.assignProvider(user.id, id, body.providerId);
  }

  @Post('requests/:id/instructions')
  dispatchInstruction(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: { instructionType: string; payload?: Record<string, unknown> },
  ) {
    return this.commandCenterService.dispatchInstruction(user.id, id, body.instructionType, body.payload);
  }

  @Post('offers')
  createOffer(@CurrentUser() user: { id: string }, @Body() body: { title: string; type: string; discountMinor?: number }) {
    return this.commandCenterService.createOffer(user.id, body);
  }

  @Get('country-configs')
  listCountryConfigs() {
    return this.commandCenterService.listCountryConfigs();
  }

  @Get('providers')
  listProviders() {
    return this.commandCenterService.listProviders();
  }

  @Get('audit-logs')
  listAuditLogs(@Query() query: { action?: string; entity?: string; countryCode?: string; severity?: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL' }) {
    return this.commandCenterService.listAuditLogs(query);
  }

  @Post('properties/:propertyId/reserve')
  reserveProperty(@CurrentUser() user: { id: string }, @Param('propertyId') propertyId: string) {
    return this.propertyCommandService.reserveProperty(user.id, propertyId);
  }

  @Post('properties/:propertyId/release')
  releasePropertyReservation(@CurrentUser() user: { id: string }, @Param('propertyId') propertyId: string) {
    return this.propertyCommandService.releaseReservation(user.id, propertyId);
  }
}