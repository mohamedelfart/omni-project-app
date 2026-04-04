import { Module } from '@nestjs/common';
import { AuditTrailModule } from '../audit-trail/audit-trail.module';
import { UnifiedRequestsModule } from '../unified-requests/unified-requests.module';
import { PublicServicesIntegrationController } from './public-services-integration.controller';
import { PublicServicesIntegrationService } from './public-services-integration.service';

@Module({
  imports: [UnifiedRequestsModule, AuditTrailModule],
  controllers: [PublicServicesIntegrationController],
  providers: [PublicServicesIntegrationService],
  exports: [PublicServicesIntegrationService],
})
export class PublicServicesIntegrationModule {}