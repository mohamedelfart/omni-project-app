import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { UnifiedRequestsModule } from '../unified-requests/unified-requests.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({
  imports: [UnifiedRequestsModule, NotificationsModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
