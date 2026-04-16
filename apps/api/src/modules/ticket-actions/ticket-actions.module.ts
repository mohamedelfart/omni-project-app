import { Module } from '@nestjs/common';
import { TicketActionsService } from './ticket-actions.service';

@Module({
  providers: [TicketActionsService],
  exports: [TicketActionsService],
})
export class TicketActionsModule {}
