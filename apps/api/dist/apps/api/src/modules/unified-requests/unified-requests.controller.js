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
exports.UnifiedRequestsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const unified_request_dto_1 = require("./dto/unified-request.dto");
const unified_requests_service_1 = require("./unified-requests.service");
let UnifiedRequestsController = class UnifiedRequestsController {
    unifiedRequestsService;
    constructor(unifiedRequestsService) {
        this.unifiedRequestsService = unifiedRequestsService;
    }
    listAll() {
        return this.unifiedRequestsService.listAll();
    }
    create(user, dto) {
        return this.unifiedRequestsService.create(user.id, dto);
    }
    getById(id) {
        return this.unifiedRequestsService.getById(id);
    }
    dispatchInstruction(id, dto) {
        return this.unifiedRequestsService.dispatchInstruction(id, dto);
    }
};
exports.UnifiedRequestsController = UnifiedRequestsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('admin', 'command-center', 'provider'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UnifiedRequestsController.prototype, "listAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, unified_request_dto_1.CreateUnifiedRequestDto]),
    __metadata("design:returntype", void 0)
], UnifiedRequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UnifiedRequestsController.prototype, "getById", null);
__decorate([
    (0, common_1.Post)(':id/instructions'),
    (0, roles_decorator_1.Roles)('admin', 'command-center'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, unified_request_dto_1.DispatchInstructionDto]),
    __metadata("design:returntype", void 0)
], UnifiedRequestsController.prototype, "dispatchInstruction", null);
exports.UnifiedRequestsController = UnifiedRequestsController = __decorate([
    (0, swagger_1.ApiTags)('unified-requests'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('unified-requests'),
    __metadata("design:paramtypes", [unified_requests_service_1.UnifiedRequestsService])
], UnifiedRequestsController);
