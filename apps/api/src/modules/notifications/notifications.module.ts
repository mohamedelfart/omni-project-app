import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { TenantPerksService } from './tenant-perks.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditTrailModule } from '../audit-trail/audit-trail.module';

@Module({
  imports: [PrismaModule, AuditTrailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, TenantPerksService],
  exports: [NotificationsService, TenantPerksService],
})
export class NotificationsModule {}
