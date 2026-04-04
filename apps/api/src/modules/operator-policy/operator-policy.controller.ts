import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OperatorPolicyService, OperatorServiceRule } from './operator-policy.service';

@ApiTags('operator-policy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'command-center')
@Controller('operator-policy')
export class OperatorPolicyController {
  constructor(private readonly operatorPolicyService: OperatorPolicyService) {}

  @Get('feature-flags')
  getFeatureFlags() {
    return this.operatorPolicyService.getFeatureFlags();
  }

  @Get('countries/:countryCode/config')
  getCountryConfig(@Param('countryCode') countryCode: string) {
    return this.operatorPolicyService.getCountryConfig(countryCode.toUpperCase());
  }

  @Put('countries/:countryCode/config')
  updateCountryConfig(
    @CurrentUser() user: { id: string },
    @Param('countryCode') countryCode: string,
    @Body() payload: Partial<{
      name: string;
      defaultCurrency: string;
      timezone: string;
      defaultLanguage: string;
      supportedLanguages: string[];
      taxPercent: number;
      maintenanceSlaHours: number;
      freeMoveInCapMinor: number;
      googleRegionCode: string;
    }>,
  ) {
    return this.operatorPolicyService.upsertCountryConfig(user.id, countryCode.toUpperCase(), payload);
  }

  @Get('countries/:countryCode/services')
  getCountryServiceRules(@Param('countryCode') countryCode: string) {
    return this.operatorPolicyService.getCountryServiceRules(countryCode.toUpperCase());
  }

  @Put('countries/:countryCode/services')
  setCountryServiceRules(
    @CurrentUser() user: { id: string },
    @Param('countryCode') countryCode: string,
    @Body() payload: { services: OperatorServiceRule[] },
  ) {
    return this.operatorPolicyService.setCountryServiceRules(user.id, countryCode.toUpperCase(), payload.services ?? []);
  }
}
