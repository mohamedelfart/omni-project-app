import { Module } from '@nestjs/common';
import { IntegrationHubService } from './integration-hub.service';

@Module({
  providers: [IntegrationHubService],
  exports: [IntegrationHubService],
})
export class IntegrationHubModule {}
