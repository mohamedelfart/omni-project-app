import { Module } from '@nestjs/common';
import { IntegrationHubModule } from '../integration-hub/integration-hub.module';
import { OrchestratorService } from './orchestrator.service';

@Module({
  imports: [IntegrationHubModule],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}