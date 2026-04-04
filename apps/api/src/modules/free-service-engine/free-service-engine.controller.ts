import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FreeServiceEngineService } from './free-service-engine.service';

class EvaluateServiceDto {
  userId!: string;
  serviceType!: string;
  countryCode!: string;
  requestedAmountMinor!: number;
}

@Controller('free-service-engine')
@UseGuards(AuthGuard('jwt'))
export class FreeServiceEngineController {
  constructor(private readonly freeServiceEngineService: FreeServiceEngineService) {}

  @Post('evaluate')
  evaluate(@Body() dto: EvaluateServiceDto) {
    return this.freeServiceEngineService.evaluate(dto);
  }

  @Get('usage/:userId/:serviceType/:countryCode')
  getUsage(
    @Param('userId') userId: string,
    @Param('serviceType') serviceType: string,
    @Param('countryCode') countryCode: string,
  ) {
    return this.freeServiceEngineService.getUsageSummary({ userId, serviceType, countryCode });
  }
}
