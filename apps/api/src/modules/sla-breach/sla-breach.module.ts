import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SlaBreachScheduler } from './sla-breach.scheduler';
import { SlaBreachService } from './sla-breach.service';

@Module({
  imports: [PrismaModule],
  providers: [SlaBreachService, SlaBreachScheduler],
  exports: [SlaBreachService],
})
export class SlaBreachModule {}
