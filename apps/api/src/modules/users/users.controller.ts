import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AssignRoleDto, UpdateTenantProfileDto } from './dto/profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin', 'command-center')
  listUsers() {
    return this.usersService.listUsers();
  }

  @Get('roles')
  @Roles('admin', 'command-center')
  listRoles() {
    return this.usersService.listRoles();
  }

  @Get('me')
  getMe(@CurrentUser() user: { id: string }) {
    return this.usersService.getUserById(user.id);
  }

  @Get(':id')
  @Roles('admin', 'command-center')
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Patch('me/tenant-profile')
  updateTenantProfile(@CurrentUser() user: { id: string }, @Body() dto: UpdateTenantProfileDto) {
    return this.usersService.updateTenantProfile(user.id, dto);
  }

  @Post(':id/roles')
  @Roles('admin', 'command-center')
  assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.usersService.assignRole(id, dto);
  }
}