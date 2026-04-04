import { Module } from '@nestjs/common';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { UnifiedRequestsModule } from '../unified-requests/unified-requests.module';
import { ViewingController } from './viewing.controller';
import { ViewingService } from './viewing.service';

@Module({
  imports: [UnifiedRequestsModule, OrchestratorModule],
  controllers: [ViewingController],
  providers: [ViewingService],
  exports: [ViewingService],
})
export class ViewingModule {}
