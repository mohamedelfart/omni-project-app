"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_module_1 = require("./modules/auth/auth.module");
const audit_trail_module_1 = require("./modules/audit-trail/audit-trail.module");
const booking_module_1 = require("./modules/booking/booking.module");
const command_center_module_1 = require("./modules/command-center/command-center.module");
const community_module_1 = require("./modules/community/community.module");
const insurance_module_1 = require("./modules/insurance/insurance.module");
const integration_hub_module_1 = require("./modules/integration-hub/integration-hub.module");
const inventory_module_1 = require("./modules/inventory/inventory.module");
const operator_policy_module_1 = require("./modules/operator-policy/operator-policy.module");
const payments_module_1 = require("./modules/payments/payments.module");
const prisma_module_1 = require("./modules/prisma/prisma.module");
const properties_module_1 = require("./modules/properties/properties.module");
const rewards_module_1 = require("./modules/rewards/rewards.module");
const services_module_1 = require("./modules/services/services.module");
const unified_requests_module_1 = require("./modules/unified-requests/unified-requests.module");
const users_module_1 = require("./modules/users/users.module");
const vendor_execution_module_1 = require("./modules/vendor-execution/vendor-execution.module");
const viewing_module_1 = require("./modules/viewing/viewing.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const orchestrator_module_1 = require("./modules/orchestrator/orchestrator.module");
const health_module_1 = require("./modules/health/health.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            audit_trail_module_1.AuditTrailModule,
            health_module_1.HealthModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            properties_module_1.PropertiesModule,
            operator_policy_module_1.OperatorPolicyModule,
            unified_requests_module_1.UnifiedRequestsModule,
            integration_hub_module_1.IntegrationHubModule,
            orchestrator_module_1.OrchestratorModule,
            viewing_module_1.ViewingModule,
            booking_module_1.BookingModule,
            payments_module_1.PaymentsModule,
            services_module_1.ServicesModule,
            insurance_module_1.InsuranceModule,
            rewards_module_1.RewardsModule,
            community_module_1.CommunityModule,
            notifications_module_1.NotificationsModule,
            command_center_module_1.CommandCenterModule,
            vendor_execution_module_1.VendorExecutionModule,
            inventory_module_1.InventoryModule,
        ],
    })
], AppModule);
