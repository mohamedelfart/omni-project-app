import { Module } from '@nestjs/common';
import { VendorExecutionController } from './vendor-execution.controller';
import { VendorExecutionService } from './vendor-execution.service';

@Module({
  controllers: [VendorExecutionController],
  providers: [VendorExecutionService],
})
export class VendorExecutionModule {}
