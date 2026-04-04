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
exports.ServicesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const service_request_dto_1 = require("./dto/service-request.dto");
const services_service_1 = require("./services.service");
let ServicesController = class ServicesController {
    servicesService;
    constructor(servicesService) {
        this.servicesService = servicesService;
    }
    createMoveIn(user, dto) {
        return this.servicesService.createMoveIn(user.id, dto);
    }
    createMaintenance(user, dto) {
        return this.servicesService.createMaintenance(user.id, dto);
    }
    createCleaning(user, dto) {
        return this.servicesService.createCleaning(user.id, dto);
    }
    createAirportTransfer(user, dto) {
        return this.servicesService.createAirportTransfer(user.id, dto);
    }
    createPaidService(user, dto) {
        return this.servicesService.createPaidService(user.id, dto);
    }
};
exports.ServicesController = ServicesController;
__decorate([
    (0, common_1.Post)('move-in'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, service_request_dto_1.CreateMoveInDto]),
    __metadata("design:returntype", void 0)
], ServicesController.prototype, "createMoveIn", null);
__decorate([
    (0, common_1.Post)('maintenance'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, service_request_dto_1.CreateMaintenanceDto]),
    __metadata("design:returntype", void 0)
], ServicesController.prototype, "createMaintenance", null);
__decorate([
    (0, common_1.Post)('cleaning'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, service_request_dto_1.CreateCleaningDto]),
    __metadata("design:returntype", void 0)
], ServicesController.prototype, "createCleaning", null);
__decorate([
    (0, common_1.Post)('airport-transfer'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, service_request_dto_1.CreateAirportTransferDto]),
    __metadata("design:returntype", void 0)
], ServicesController.prototype, "createAirportTransfer", null);
__decorate([
    (0, common_1.Post)('paid'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, service_request_dto_1.CreatePaidServiceDto]),
    __metadata("design:returntype", void 0)
], ServicesController.prototype, "createPaidService", null);
exports.ServicesController = ServicesController = __decorate([
    (0, swagger_1.ApiTags)('services'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('services'),
    __metadata("design:paramtypes", [services_service_1.ServicesService])
], ServicesController);
