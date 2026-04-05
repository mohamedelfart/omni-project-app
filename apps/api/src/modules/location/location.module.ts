import { Module } from '@nestjs/common';
import { GoogleMapsAdapter } from './adapters/google-maps.adapter';
import { LocationService } from './location.service';

@Module({
  providers: [GoogleMapsAdapter, LocationService],
  exports: [LocationService],
})
export class LocationModule {}
