import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CommandCenterService } from './command-center.service';

@ApiTags('command-center')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'command-center')
@Controller('command-center')
export class CommandCenterController {
  constructor(private readonly commandCenterService: CommandCenterService) {}

  @Get('dashboard')
  getDashboard(@Query() query: { countryCode?: string; startDate?: string; endDate?: string; assetId?: string; serviceType?: string; status?: string }) {
    return this.commandCenterService.getDashboard(query);
  }

  @Get('requests')
  listRequests(@Query() query: { countryCode?: string; startDate?: string; endDate?: string; assetId?: string; serviceType?: string; status?: string }) {
    return this.commandCenterService.listRequests(query);
  }

  @Post('requests/:id/assign-provider')
  assignProvider(@Param('id') id: string, @Body() body: { providerId: string }) {
    return this.commandCenterService.assignProvider(id, body.providerId);
  }

  @Post('requests/:id/instructions')
  dispatchInstruction(@Param('id') id: string, @Body() body: { instructionType: string; payload?: Record<string, unknown> }) {
    return this.commandCenterService.dispatchInstruction(id, body.instructionType, body.payload);
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
}