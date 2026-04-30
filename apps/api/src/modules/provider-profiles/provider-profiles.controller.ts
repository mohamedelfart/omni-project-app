import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ProviderProfilesService } from './provider-profiles.service';

@ApiTags('provider-profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('provider')
@Controller('provider-profiles')
export class ProviderProfilesController {
  constructor(private readonly providerProfilesService: ProviderProfilesService) {}

  @Get('me')
  listMyMemberships(@CurrentUser() user: AuthenticatedUser) {
    return this.providerProfilesService.listMembershipsForUser(user.id);
  }
}
