import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SlaPolicyService } from './sla-policy.service';

@Module({
  imports: [PrismaModule],
  providers: [SlaPolicyService],
  exports: [SlaPolicyService],
})
export class SlaPolicyModule {}
