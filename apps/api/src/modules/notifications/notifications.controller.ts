import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BroadcastNotificationDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';
import { TenantPerksService } from './tenant-perks.service';

class SendManualPerkDto {
  tenantUserId!: string;
  title!: string;
  body!: string;
  points!: number;
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly tenantPerksService: TenantPerksService,
  ) {}

  @Get('me')
  list(@CurrentUser() user: { id: string }) {
    return this.notificationsService.listForUser(user.id);
  }

  @Post('broadcast')
  @Roles('admin', 'command-center')
  broadcast(@Body() payload: BroadcastNotificationDto) {
    return this.notificationsService.broadcast(payload);
  }

  @Get('perks/templates')
  @Roles('admin', 'command-center')
  getPerkTemplates() {
    return this.tenantPerksService.getTemplates();
  }

  @Post('perks/manual')
  @Roles('admin', 'command-center')
  sendManualPerk(
    @CurrentUser() admin: { id: string },
    @Body() dto: SendManualPerkDto,
  ) {
    return this.tenantPerksService.sendManualPerk({
      adminUserId: admin.id,
      tenantUserId: dto.tenantUserId,
      title: dto.title,
      body: dto.body,
      points: dto.points,
    });
  }

  @Post('perks/process-anniversaries')
  @Roles('admin')
  processAnniversaries() {
    return this.tenantPerksService.processAnniversaryPerks();
  }

  @Post('perks/check-milestones/:userId')
  @Roles('admin', 'command-center')
  checkMilestones(@Param('userId') userId: string) {
    return this.tenantPerksService.checkAndTriggerMilestones(userId);
  }
}