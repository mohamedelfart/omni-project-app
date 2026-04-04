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
exports.CommandCenterController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const command_center_service_1 = require("./command-center.service");
let CommandCenterController = class CommandCenterController {
    commandCenterService;
    constructor(commandCenterService) {
        this.commandCenterService = commandCenterService;
    }
    getDashboard() {
        return this.commandCenterService.getDashboard();
    }
    listRequests() {
        return this.commandCenterService.listRequests();
    }
    assignProvider(id, body) {
        return this.commandCenterService.assignProvider(id, body.providerId);
    }
    dispatchInstruction(id, body) {
        return this.commandCenterService.dispatchInstruction(id, body.instructionType, body.payload);
    }
    createOffer(user, body) {
        return this.commandCenterService.createOffer(user.id, body);
    }
    listCountryConfigs() {
        return this.commandCenterService.listCountryConfigs();
    }
    listProviders() {
        return this.commandCenterService.listProviders();
    }
    listAuditLogs(query) {
        return this.commandCenterService.listAuditLogs(query);
    }
};
exports.CommandCenterController = CommandCenterController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CommandCenterController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('requests'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CommandCenterController.prototype, "listRequests", null);
__decorate([
    (0, common_1.Post)('requests/:id/assign-provider'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CommandCenterController.prototype, "assignProvider", null);
__decorate([
    (0, common_1.Post)('requests/:id/instructions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CommandCenterController.prototype, "dispatchInstruction", null);
__decorate([
    (0, common_1.Post)('offers'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CommandCenterController.prototype, "createOffer", null);
__decorate([
    (0, common_1.Get)('country-configs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CommandCenterController.prototype, "listCountryConfigs", null);
__decorate([
    (0, common_1.Get)('providers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CommandCenterController.prototype, "listProviders", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CommandCenterController.prototype, "listAuditLogs", null);
exports.CommandCenterController = CommandCenterController = __decorate([
    (0, swagger_1.ApiTags)('command-center'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'command-center'),
    (0, common_1.Controller)('command-center'),
    __metadata("design:paramtypes", [command_center_service_1.CommandCenterService])
], CommandCenterController);
