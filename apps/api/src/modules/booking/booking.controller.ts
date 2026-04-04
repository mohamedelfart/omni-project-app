import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateBookingRequestDto } from './dto/booking.dto';
import { BookingService } from './booking.service';

@ApiTags('booking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateBookingRequestDto) {
    return this.bookingService.create(user.id, dto);
  }

  @Get('me')
  list(@CurrentUser() user: { id: string }) {
    return this.bookingService.list(user.id);
  }
}