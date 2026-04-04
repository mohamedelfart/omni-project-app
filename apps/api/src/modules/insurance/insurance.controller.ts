import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateInsuranceClaimDto, SubscribeInsuranceDto } from './dto/insurance.dto';
import { InsuranceService } from './insurance.service';

@ApiTags('insurance')
@Controller('insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Get('plans')
  listPlans() {
    return this.insuranceService.listPlans();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant')
  @Post('plans/subscribe')
  subscribe(@CurrentUser() user: { id: string }, @Body() payload: SubscribeInsuranceDto) {
    return this.insuranceService.subscribe(user.id, payload);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant', 'admin', 'command-center')
  @Post('claims')
  createClaim(@Body() payload: CreateInsuranceClaimDto) {
    return this.insuranceService.createClaim(payload);
  }
}