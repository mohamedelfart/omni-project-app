import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { VendorExecutionService } from './vendor-execution.service';

@ApiTags('vendor-execution')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('provider')
@Controller('vendor')
export class VendorExecutionController {
  constructor(private readonly vendorExecutionService: VendorExecutionService) {}

  @Get('tickets/me')
  listMyTickets(@CurrentUser() user: { id: string }) {
    return this.vendorExecutionService.listMyTickets(user.id);
  }

  @Patch('tickets/:id/status')
  updateTicketStatus(
    @CurrentUser() user: { id: string },
    @Param('id') ticketId: string,
    @Body() body: { status: string; note?: string },
  ) {
    return this.vendorExecutionService.updateTicketStatus(user.id, ticketId, body.status, body.note);
  }
}
