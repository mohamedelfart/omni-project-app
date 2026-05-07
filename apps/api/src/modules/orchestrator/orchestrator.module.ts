import { Module } from '@nestjs/common';
import { IntegrationHubModule } from '../integration-hub/integration-hub.module';
import { OperatorPolicyModule } from '../operator-policy/operator-policy.module';
import { TicketActionsModule } from '../ticket-actions/ticket-actions.module';
import { OrchestratorService } from './orchestrator.service';

@Module({
  imports: [IntegrationHubModule, OperatorPolicyModule, TicketActionsModule],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}