import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CostControlService } from './cost-control.service';

@ApiTags('cost-control')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'command-center')
@Controller('cost-control')
export class CostControlController {
  constructor(private readonly costControlService: CostControlService) {}

  @Get('summary')
  getSummary(@Query() query: { countryCode?: string; startDate?: string; endDate?: string; assetId?: string; serviceType?: string }) {
    return this.costControlService.getSummary(query);
  }
}