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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePaidServiceDto = exports.CreateAirportTransferDto = exports.CreateCleaningDto = exports.CreateMaintenanceDto = exports.CreateMoveInDto = void 0;
const class_validator_1 = require("class-validator");
class CreateMoveInDto {
    moveDate;
    pickupAddress;
    dropoffAddress;
    estimatedCostMinor;
}
exports.CreateMoveInDto = CreateMoveInDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMoveInDto.prototype, "moveDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMoveInDto.prototype, "pickupAddress", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMoveInDto.prototype, "dropoffAddress", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateMoveInDto.prototype, "estimatedCostMinor", void 0);
class CreateMaintenanceDto {
    category;
    severity;
    preferredVisitAt;
}
exports.CreateMaintenanceDto = CreateMaintenanceDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMaintenanceDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMaintenanceDto.prototype, "severity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMaintenanceDto.prototype, "preferredVisitAt", void 0);
class CreateCleaningDto {
    serviceDate;
    durationHours;
}
exports.CreateCleaningDto = CreateCleaningDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateCleaningDto.prototype, "serviceDate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateCleaningDto.prototype, "durationHours", void 0);
class CreateAirportTransferDto {
    pickupAt;
    pickupLat;
    pickupLng;
    dropoffLat;
    dropoffLng;
    flightNumber;
}
exports.CreateAirportTransferDto = CreateAirportTransferDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateAirportTransferDto.prototype, "pickupAt", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateAirportTransferDto.prototype, "pickupLat", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateAirportTransferDto.prototype, "pickupLng", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateAirportTransferDto.prototype, "dropoffLat", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateAirportTransferDto.prototype, "dropoffLng", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAirportTransferDto.prototype, "flightNumber", void 0);
class CreatePaidServiceDto {
    requestType;
    serviceType;
    city;
}
exports.CreatePaidServiceDto = CreatePaidServiceDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaidServiceDto.prototype, "requestType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaidServiceDto.prototype, "serviceType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaidServiceDto.prototype, "city", void 0);
