import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ViewingService } from './viewing.service';

@ApiTags('viewing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('viewing')
export class ViewingController {
  constructor(private readonly viewingService: ViewingService) {}

  @Get('shortlist')
  getShortlist(@CurrentUser() user: { id: string }) {
    return this.viewingService.getOrCreateShortlist(user.id);
  }

  @Post('shortlist/:propertyId')
  addToShortlist(@CurrentUser() user: { id: string }, @Param('propertyId') propertyId: string) {
    return this.viewingService.addToShortlist(user.id, propertyId);
  }

  @Delete('shortlist/:propertyId')
  removeFromShortlist(@CurrentUser() user: { id: string }, @Param('propertyId') propertyId: string) {
    return this.viewingService.removeFromShortlist(user.id, propertyId);
  }

  @Get('compare')
  compare(@CurrentUser() user: { id: string }) {
    return this.viewingService.compare(user.id);
  }

  @Post('requests')
  createRequest(
    @CurrentUser() user: { id: string },
    @Body() body: { preferredDateISO: string; pickupLat: number; pickupLng: number; notes?: string },
  ) {
    return this.viewingService.createViewingRequest(user.id, body);
  }

  @Post('requests/:id/confirm-property')
  confirmSelectedProperty(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: { propertyId: string },
  ) {
    return this.viewingService.confirmSelectedProperty(user.id, id, body.propertyId);
  }

  @Get('requests')
  listRequests() {
    return this.viewingService.listViewingRequests();
  }

  @Get('requests/:id')
  getRequestById(@Param('id') id: string) {
    return this.viewingService.getViewingRequestById(id);
  }
}