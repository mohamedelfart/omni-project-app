import { Module } from '@nestjs/common';
import { FreeServiceEngineService } from './free-service-engine.service';
import { FreeServiceEngineController } from './free-service-engine.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditTrailModule } from '../audit-trail/audit-trail.module';
import { OperatorPolicyModule } from '../operator-policy/operator-policy.module';

@Module({
  imports: [PrismaModule, AuditTrailModule, OperatorPolicyModule],
  controllers: [FreeServiceEngineController],
  providers: [FreeServiceEngineService],
  exports: [FreeServiceEngineService],
})
export class FreeServiceEngineModule {}
