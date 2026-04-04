import { Module } from '@nestjs/common';
import { OperatorPolicyController } from './operator-policy.controller';
import { OperatorPolicyService } from './operator-policy.service';

@Module({
  controllers: [OperatorPolicyController],
  providers: [OperatorPolicyService],
  exports: [OperatorPolicyService],
})
export class OperatorPolicyModule {}
