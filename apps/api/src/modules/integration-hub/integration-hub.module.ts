import { Module } from '@nestjs/common';
import { OperatorPolicyModule } from '../operator-policy/operator-policy.module';
import { AdapterRegistryService } from './adapter-registry.service';
import { IntegrationHubService } from './integration-hub.service';

@Module({
  imports: [OperatorPolicyModule],
  providers: [IntegrationHubService, AdapterRegistryService],
  exports: [IntegrationHubService, AdapterRegistryService],
})
export class IntegrationHubModule {}
