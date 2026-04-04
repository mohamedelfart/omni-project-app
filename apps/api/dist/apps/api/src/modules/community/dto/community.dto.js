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
exports.CreateCommunityReportDto = exports.CreateCommunityCommentDto = exports.CreateCommunityPostDto = void 0;
const class_validator_1 = require("class-validator");
class CreateCommunityPostDto {
    title;
    content;
}
exports.CreateCommunityPostDto = CreateCommunityPostDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCommunityPostDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCommunityPostDto.prototype, "content", void 0);
class CreateCommunityCommentDto {
    postId;
    content;
}
exports.CreateCommunityCommentDto = CreateCommunityCommentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCommunityCommentDto.prototype, "postId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCommunityCommentDto.prototype, "content", void 0);
class CreateCommunityReportDto {
    postId;
    reason;
}
exports.CreateCommunityReportDto = CreateCommunityReportDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCommunityReportDto.prototype, "postId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCommunityReportDto.prototype, "reason", void 0);
