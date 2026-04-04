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
exports.InsuranceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const insurance_dto_1 = require("./dto/insurance.dto");
const insurance_service_1 = require("./insurance.service");
let InsuranceController = class InsuranceController {
    insuranceService;
    constructor(insuranceService) {
        this.insuranceService = insuranceService;
    }
    listPlans() {
        return this.insuranceService.listPlans();
    }
    subscribe(user, payload) {
        return this.insuranceService.subscribe(user.id, payload);
    }
    createClaim(payload) {
        return this.insuranceService.createClaim(payload);
    }
};
exports.InsuranceController = InsuranceController;
__decorate([
    (0, common_1.Get)('plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "listPlans", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('tenant'),
    (0, common_1.Post)('plans/subscribe'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, insurance_dto_1.SubscribeInsuranceDto]),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "subscribe", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('tenant', 'admin', 'command-center'),
    (0, common_1.Post)('claims'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [insurance_dto_1.CreateInsuranceClaimDto]),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "createClaim", null);
exports.InsuranceController = InsuranceController = __decorate([
    (0, swagger_1.ApiTags)('insurance'),
    (0, common_1.Controller)('insurance'),
    __metadata("design:paramtypes", [insurance_service_1.InsuranceService])
], InsuranceController);
