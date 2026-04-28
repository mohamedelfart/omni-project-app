import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SlaBreachScheduler } from './sla-breach.scheduler';
import { SlaBreachService } from './sla-breach.service';
import { TicketActionsModule } from '../ticket-actions/ticket-actions.module';

@Module({
  imports: [PrismaModule, TicketActionsModule],
  providers: [SlaBreachService, SlaBreachScheduler],
  exports: [SlaBreachService],
})
export class SlaBreachModule {}
