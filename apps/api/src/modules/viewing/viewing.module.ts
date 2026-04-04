import { Module } from '@nestjs/common';
import { AuditTrailModule } from '../audit-trail/audit-trail.module';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { UnifiedRequestsModule } from '../unified-requests/unified-requests.module';
import { ViewingController } from './viewing.controller';
import { ViewingService } from './viewing.service';

@Module({
  imports: [UnifiedRequestsModule, OrchestratorModule, AuditTrailModule],
  controllers: [ViewingController],
  providers: [ViewingService],
  exports: [ViewingService],
})
export class ViewingModule {}
