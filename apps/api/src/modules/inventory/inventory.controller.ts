import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'command-center')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('overview')
  getOverview() {
    return this.inventoryService.getOverview();
  }

  @Get('assets')
  listAssets(@Query() query: { status?: string; city?: string; countryCode?: string }) {
    return this.inventoryService.listAssets(query);
  }

  @Get('orders')
  listOrders(@Query() query: { status?: string }) {
    return this.inventoryService.listOrders(query);
  }

  @Get('tickets')
  listTickets(@Query() query: { status?: string; serviceType?: string; country?: string }) {
    return this.inventoryService.listTickets(query);
  }

  @Get('financial-records')
  listFinancialRecords(@Query() query: { status?: string }) {
    return this.inventoryService.listFinancialRecords(query);
  }
}
