import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { TicketAction } from '@quickrent/shared-types';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  AssignVendorDto,
  ChangeUnifiedRequestPriorityDto,
  CreateRealtimeRequestDto,
  CreateUnifiedRequestDto,
  DispatchInstructionDto,
  EscalateRequestDto,
  UpdateRealtimeRequestStatusDto,
} from './dto/unified-request.dto';
import { UnifiedRequestsService } from './unified-requests.service';

@ApiTags('unified-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('unified-requests')
export class UnifiedRequestsController {
  constructor(private readonly unifiedRequestsService: UnifiedRequestsService) {}

  @Get('me')
  @Roles('tenant', 'guest')
  listMine(@CurrentUser() user: { id: string }) {
    return this.unifiedRequestsService.listMine(user.id);
  }

  @Get()
  @Roles('admin', 'command-center', 'provider')
  listAll() {
    return this.unifiedRequestsService.listAll();
  }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateUnifiedRequestDto) {
    return this.unifiedRequestsService.create(user.id, dto);
  }

  @Post('realtime')
  @Roles('tenant', 'guest')
  createRealtime(@CurrentUser() user: { id: string }, @Body() dto: CreateRealtimeRequestDto) {
    return this.unifiedRequestsService.createRealtimeRequest(user.id, dto);
  }

  @Get('realtime/me')
  @Roles('tenant')
  listRealtimeMine(@CurrentUser() user: { id: string }) {
    return this.unifiedRequestsService.listRealtimeMine(user.id);
  }

  @Get('realtime/vendor/me')
  @Roles('provider')
  listRealtimeForVendor(@CurrentUser() user: AuthenticatedUser) {
    return this.unifiedRequestsService.listRealtimeForVendor(user);
  }

  @Get('realtime')
  @Roles('admin', 'command-center')
  listRealtimeForDashboard() {
    return this.unifiedRequestsService.listRealtimeForDashboard();
  }

  @Post('realtime/:id/assign')
  @Roles('admin', 'command-center')
  assignVendor(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignVendorDto) {
    return this.unifiedRequestsService.assignVendor(id, dto, user);
  }

  @Post('realtime/:id/status')
  @Roles('provider')
  updateRealtimeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRealtimeRequestStatusDto,
  ) {
    return this.unifiedRequestsService.updateRealtimeStatus(id, user, dto);
  }

  @Get(':id/history')
  @Roles('admin', 'command-center', 'tenant', 'provider')
  getRequestHistory(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<TicketAction[]> {
    return this.unifiedRequestsService.getTicketActionHistory(id, user);
  }

  @Post(':id/escalate')
  @Roles('admin', 'command-center')
  escalate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: EscalateRequestDto,
  ): Promise<TicketAction> {
    return this.unifiedRequestsService.appendEscalationAction(id, user, dto);
  }

  @Post(':id/priority')
  @Roles('admin', 'command-center')
  changePriority(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ChangeUnifiedRequestPriorityDto,
  ) {
    return this.unifiedRequestsService.changeUnifiedRequestPriority(id, user, dto);
  }

  @Post(':id/status')
  @Roles('admin', 'command-center')
  updateStatusCommandCenter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRealtimeRequestStatusDto,
  ) {
    return this.unifiedRequestsService.updateUnifiedRequestStatusCommandCenter(id, user, dto);
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.unifiedRequestsService.getById(id, user);
  }

  @Post(':id/instructions')
  @Roles('admin', 'command-center')
  dispatchInstruction(@Param('id') id: string, @Body() dto: DispatchInstructionDto) {
    return this.unifiedRequestsService.dispatchInstruction(id, dto);
  }
}