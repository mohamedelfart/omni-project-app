import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProviderProfilesController } from './provider-profiles.controller';
import { ProviderProfilesService } from './provider-profiles.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProviderProfilesController],
  providers: [ProviderProfilesService],
})
export class ProviderProfilesModule {}
