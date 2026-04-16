import { Module } from '@nestjs/common';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { UnifiedRequestsController } from './unified-requests.controller';
import { UnifiedRequestsGateway } from './unified-requests.gateway';
import { UnifiedRequestsService } from './unified-requests.service';

@Module({
  imports: [OrchestratorModule],
  controllers: [UnifiedRequestsController],
  providers: [UnifiedRequestsService, UnifiedRequestsGateway],
  exports: [UnifiedRequestsService],
})
export class UnifiedRequestsModule {}