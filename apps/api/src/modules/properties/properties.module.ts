import { Module } from '@nestjs/common';
import { AuditTrailModule } from '../audit-trail/audit-trail.module';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { PropertyCommandService } from './property-command.service';

@Module({
  imports: [AuditTrailModule],
  controllers: [PropertiesController],
  providers: [PropertiesService, PropertyCommandService],
  exports: [PropertiesService, PropertyCommandService],
})
export class PropertiesModule {}
