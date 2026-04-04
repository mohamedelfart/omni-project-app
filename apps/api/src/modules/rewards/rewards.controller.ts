import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateOfferDto } from './dto/rewards.dto';
import { RewardsService } from './rewards.service';

@ApiTags('rewards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get('wallet')
  @Roles('tenant')
  wallet(@CurrentUser() user: { id: string }) {
    return this.rewardsService.getWallet(user.id);
  }

  @Post('offers')
  @Roles('admin', 'command-center')
  createOffer(@CurrentUser() user: { id: string }, @Body() dto: CreateOfferDto) {
    return this.rewardsService.createOffer(user.id, dto);
  }
}