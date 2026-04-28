import { Module } from '@nestjs/common';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { SlaPolicyModule } from '../sla-policy/sla-policy.module';
import { TicketActionsModule } from '../ticket-actions/ticket-actions.module';
import { UnifiedRequestsController } from './unified-requests.controller';
import { UnifiedRequestsGateway } from './unified-requests.gateway';
import { UnifiedRequestsService } from './unified-requests.service';

@Module({
  imports: [OrchestratorModule, TicketActionsModule, SlaPolicyModule],
  controllers: [UnifiedRequestsController],
  providers: [UnifiedRequestsService, UnifiedRequestsGateway],
  exports: [UnifiedRequestsService],
})
export class UnifiedRequestsModule {}