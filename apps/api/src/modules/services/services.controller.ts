import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CreateAirportTransferDto,
  CreateCleaningDto,
  CreateMaintenanceDto,
  CreateMoveInDto,
  CreatePaidServiceDto,
} from './dto/service-request.dto';
import { ServicesService } from './services.service';

@ApiTags('services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post('move-in')
  createMoveIn(@CurrentUser() user: { id: string }, @Body() dto: CreateMoveInDto) {
    return this.servicesService.createMoveIn(user.id, dto);
  }

  @Post('maintenance')
  createMaintenance(@CurrentUser() user: { id: string }, @Body() dto: CreateMaintenanceDto) {
    return this.servicesService.createMaintenance(user.id, dto);
  }

  @Post('cleaning')
  createCleaning(@CurrentUser() user: { id: string }, @Body() dto: CreateCleaningDto) {
    return this.servicesService.createCleaning(user.id, dto);
  }

  @Post('airport-transfer')
  createAirportTransfer(@CurrentUser() user: { id: string }, @Body() dto: CreateAirportTransferDto) {
    return this.servicesService.createAirportTransfer(user.id, dto);
  }

  @Post('paid')
  createPaidService(@CurrentUser() user: { id: string }, @Body() dto: CreatePaidServiceDto) {
    return this.servicesService.createPaidService(user.id, dto);
  }
}