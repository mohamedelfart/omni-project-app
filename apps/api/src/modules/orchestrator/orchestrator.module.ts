import { Module } from '@nestjs/common';
import { IntegrationHubModule } from '../integration-hub/integration-hub.module';
import { OperatorPolicyModule } from '../operator-policy/operator-policy.module';
import { OrchestratorService } from './orchestrator.service';

@Module({
  imports: [IntegrationHubModule, OperatorPolicyModule],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}