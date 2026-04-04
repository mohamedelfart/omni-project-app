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
exports.ViewingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const viewing_service_1 = require("./viewing.service");
let ViewingController = class ViewingController {
    viewingService;
    constructor(viewingService) {
        this.viewingService = viewingService;
    }
    getShortlist(user) {
        return this.viewingService.getOrCreateShortlist(user.id);
    }
    addToShortlist(user, propertyId) {
        return this.viewingService.addToShortlist(user.id, propertyId);
    }
    compare(user) {
        return this.viewingService.compare(user.id);
    }
    createRequest(user, body) {
        return this.viewingService.createViewingRequest(user.id, body);
    }
    listRequests() {
        return this.viewingService.listViewingRequests();
    }
};
exports.ViewingController = ViewingController;
__decorate([
    (0, common_1.Get)('shortlist'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ViewingController.prototype, "getShortlist", null);
__decorate([
    (0, common_1.Post)('shortlist/:propertyId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('propertyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ViewingController.prototype, "addToShortlist", null);
__decorate([
    (0, common_1.Get)('compare'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ViewingController.prototype, "compare", null);
__decorate([
    (0, common_1.Post)('requests'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ViewingController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Get)('requests'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ViewingController.prototype, "listRequests", null);
exports.ViewingController = ViewingController = __decorate([
    (0, swagger_1.ApiTags)('viewing'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('viewing'),
    __metadata("design:paramtypes", [viewing_service_1.ViewingService])
], ViewingController);
