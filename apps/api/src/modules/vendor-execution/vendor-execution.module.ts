import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { OperatorPolicyModule } from '../operator-policy/operator-policy.module';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { UnifiedRequestsModule } from '../unified-requests/unified-requests.module';
import { VendorExecutionController } from './vendor-execution.controller';
import { VendorExecutionService } from './vendor-execution.service';

@Module({
  imports: [NotificationsModule, OrchestratorModule, OperatorPolicyModule, UnifiedRequestsModule],
  controllers: [VendorExecutionController],
  providers: [VendorExecutionService],
})
export class VendorExecutionModule {}
