import { Module } from '@nestjs/common';
import { OperatorPolicyModule } from '../operator-policy/operator-policy.module';
import { UnifiedRequestsModule } from '../unified-requests/unified-requests.module';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [UnifiedRequestsModule, OperatorPolicyModule],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
