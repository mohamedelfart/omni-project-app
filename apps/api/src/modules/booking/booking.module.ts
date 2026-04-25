import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { UnifiedRequestsModule } from '../unified-requests/unified-requests.module';
import { AuditTrailModule } from '../audit-trail/audit-trail.module';
import { BookingController } from './booking.controller';
import { BookingCommandService } from './booking-command.service';
import { BookingService } from './booking.service';

@Module({
  imports: [UnifiedRequestsModule, NotificationsModule, AuditTrailModule],
  controllers: [BookingController],
  providers: [BookingService, BookingCommandService],
  exports: [BookingService, BookingCommandService],
})
export class BookingModule {}
