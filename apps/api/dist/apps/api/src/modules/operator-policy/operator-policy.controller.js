"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperatorPolicyController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const operator_policy_service_1 = require("./operator-policy.service");
let OperatorPolicyController = class OperatorPolicyController {
    operatorPolicyService;
    constructor(operatorPolicyService) {
        this.operatorPolicyService = operatorPolicyService;
    }
    getFeatureFlags() {
        return this.operatorPolicyService.getFeatureFlags();
    }
    getCountryConfig(countryCode) {
        return this.operatorPolicyService.getCountryConfig(countryCode.toUpperCase());
    }
    updateCountryConfig(user, countryCode, payload) {
        return this.operatorPolicyService.upsertCountryConfig(user.id, countryCode.toUpperCase(), payload);
    }
    getCountryServiceRules(countryCode) {
        return this.operatorPolicyService.getCountryServiceRules(countryCode.toUpperCase());
    }
    setCountryServiceRules(user, countryCode, payload) {
        return this.operatorPolicyService.setCountryServiceRules(user.id, countryCode.toUpperCase(), payload.services ?? []);
    }
};
exports.OperatorPolicyController = OperatorPolicyController;
__decorate([
    (0, common_1.Get)('feature-flags'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OperatorPolicyController.prototype, "getFeatureFlags", null);
__decorate([
    (0, common_1.Get)('countries/:countryCode/config'),
    __param(0, (0, common_1.Param)('countryCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OperatorPolicyController.prototype, "getCountryConfig", null);
__decorate([
    (0, common_1.Put)('countries/:countryCode/config'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('countryCode')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], OperatorPolicyController.prototype, "updateCountryConfig", null);
__decorate([
    (0, common_1.Get)('countries/:countryCode/services'),
    __param(0, (0, common_1.Param)('countryCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OperatorPolicyController.prototype, "getCountryServiceRules", null);
__decorate([
    (0, common_1.Put)('countries/:countryCode/services'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('countryCode')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], OperatorPolicyController.prototype, "setCountryServiceRules", null);
exports.OperatorPolicyController = OperatorPolicyController = __decorate([
    (0, swagger_1.ApiTags)('operator-policy'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'command-center'),
    (0, common_1.Controller)('operator-policy'),
    __metadata("design:paramtypes", [operator_policy_service_1.OperatorPolicyService])
], OperatorPolicyController);
