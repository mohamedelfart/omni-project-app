"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RequestLoggingInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestLoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
let RequestLoggingInterceptor = RequestLoggingInterceptor_1 = class RequestLoggingInterceptor {
    logger = new common_1.Logger(RequestLoggingInterceptor_1.name);
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const startedAt = Date.now();
        return next.handle().pipe((0, rxjs_1.tap)(() => {
            this.logger.log(`${request.method} ${request.url} ${Date.now() - startedAt}ms`);
        }));
    }
};
exports.RequestLoggingInterceptor = RequestLoggingInterceptor;
exports.RequestLoggingInterceptor = RequestLoggingInterceptor = RequestLoggingInterceptor_1 = __decorate([
    (0, common_1.Injectable)()
], RequestLoggingInterceptor);
