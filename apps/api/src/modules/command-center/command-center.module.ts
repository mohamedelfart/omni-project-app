import { Module } from '@nestjs/common';
import { LocationModule } from '../location/location.module';
import { OperatorPolicyModule } from '../operator-policy/operator-policy.module';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { BookingModule } from '../booking/booking.module';
import { PropertiesModule } from '../properties/properties.module';
import { CommandCenterController } from './command-center.controller';
import { CommandCenterService } from './command-center.service';
import { DecisionSupportService } from './decision-support.service';

@Module({
  imports: [OrchestratorModule, OperatorPolicyModule, LocationModule, PropertiesModule, BookingModule],
  controllers: [CommandCenterController],
  providers: [CommandCenterService, DecisionSupportService],
  exports: [CommandCenterService],
})
export class CommandCenterModule {}