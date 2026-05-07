import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AppendProviderOperationalIntentDto } from './dto/append-provider-operational-intent.dto';
import { VendorExecutionService } from './vendor-execution.service';

@ApiTags('vendor-execution')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('provider')
@Controller('vendor')
export class VendorExecutionController {
  constructor(private readonly vendorExecutionService: VendorExecutionService) {}

  @Get('tickets/me')
  listMyTickets(@CurrentUser() user: AuthenticatedUser) {
    return this.vendorExecutionService.listMyTickets(user);
  }

  @Patch('tickets/:id/status')
  updateTicketStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') ticketId: string,
    @Body() body: { status: string; note?: string },
  ) {
    return this.vendorExecutionService.updateTicketStatus(user, ticketId, body.status, body.note);
  }

  @Post('tickets/:id/operational-intents')
  appendOperationalIntent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') ticketId: string,
    @Body() dto: AppendProviderOperationalIntentDto,
  ) {
    return this.vendorExecutionService.appendOperationalIntent(user, ticketId, dto);
  }
}
