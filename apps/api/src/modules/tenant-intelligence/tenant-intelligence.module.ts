import { Module } from '@nestjs/common';
import { FreeServiceEngineModule } from '../free-service-engine/free-service-engine.module';
import { OperatorPolicyModule } from '../operator-policy/operator-policy.module';
import { TenantIntelligenceController } from './tenant-intelligence.controller';
import { TenantIntelligenceService } from './tenant-intelligence.service';

@Module({
  imports: [OperatorPolicyModule, FreeServiceEngineModule],
  controllers: [TenantIntelligenceController],
  providers: [TenantIntelligenceService],
})
export class TenantIntelligenceModule {}
