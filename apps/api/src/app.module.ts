import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './modules/auth/auth.module';
import { AuditTrailModule } from './modules/audit-trail/audit-trail.module';
import { BookingModule } from './modules/booking/booking.module';
import { CommandCenterModule } from './modules/command-center/command-center.module';
import { CommunityModule } from './modules/community/community.module';
import { FreeServiceEngineModule } from './modules/free-service-engine/free-service-engine.module';
import { InsuranceModule } from './modules/insurance/insurance.module';
import { IntegrationHubModule } from './modules/integration-hub/integration-hub.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OperatorPolicyModule } from './modules/operator-policy/operator-policy.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { ServicesModule } from './modules/services/services.module';
import { UnifiedRequestsModule } from './modules/unified-requests/unified-requests.module';
import { UsersModule } from './modules/users/users.module';
import { VendorExecutionModule } from './modules/vendor-execution/vendor-execution.module';
import { ViewingModule } from './modules/viewing/viewing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditTrailModule,
    HealthModule,
    AuthModule,
    UsersModule,
    PropertiesModule,
    OperatorPolicyModule,
    FreeServiceEngineModule,
    UnifiedRequestsModule,
    IntegrationHubModule,
    OrchestratorModule,
    ViewingModule,
    BookingModule,
    PaymentsModule,
    ServicesModule,
    InsuranceModule,
    RewardsModule,
    CommunityModule,
    NotificationsModule,
    CommandCenterModule,
    VendorExecutionModule,
    InventoryModule,
  ],
})
export class AppModule {}
