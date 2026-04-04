"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorExecutionModule = void 0;
const common_1 = require("@nestjs/common");
const vendor_execution_controller_1 = require("./vendor-execution.controller");
const vendor_execution_service_1 = require("./vendor-execution.service");
let VendorExecutionModule = class VendorExecutionModule {
};
exports.VendorExecutionModule = VendorExecutionModule;
exports.VendorExecutionModule = VendorExecutionModule = __decorate([
    (0, common_1.Module)({
        controllers: [vendor_execution_controller_1.VendorExecutionController],
        providers: [vendor_execution_service_1.VendorExecutionService],
    })
], VendorExecutionModule);
