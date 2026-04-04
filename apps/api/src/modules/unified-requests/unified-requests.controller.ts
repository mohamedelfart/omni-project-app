import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateUnifiedRequestDto, DispatchInstructionDto } from './dto/unified-request.dto';
import { UnifiedRequestsService } from './unified-requests.service';

@ApiTags('unified-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('unified-requests')
export class UnifiedRequestsController {
  constructor(private readonly unifiedRequestsService: UnifiedRequestsService) {}

  @Get('me')
  @Roles('tenant')
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

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.unifiedRequestsService.getById(id);
  }

  @Post(':id/instructions')
  @Roles('admin', 'command-center')
  dispatchInstruction(@Param('id') id: string, @Body() dto: DispatchInstructionDto) {
    return this.unifiedRequestsService.dispatchInstruction(id, dto);
  }
}