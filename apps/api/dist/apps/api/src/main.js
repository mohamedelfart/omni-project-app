"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = __importDefault(require("helmet"));
const config_1 = require("@quickrent/config");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const request_logging_interceptor_1 = require("./common/interceptors/request-logging.interceptor");
const response_envelope_interceptor_1 = require("./common/interceptors/response-envelope.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const env = (0, config_1.parseApiEnv)(process.env);
    app.setGlobalPrefix(env.API_PREFIX);
    app.use((0, helmet_1.default)());
    app.enableCors({
        origin: true,
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidUnknownValues: false,
        forbidNonWhitelisted: true,
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new request_logging_interceptor_1.RequestLoggingInterceptor(), new response_envelope_interceptor_1.ResponseEnvelopeInterceptor());
    const config = new swagger_1.DocumentBuilder()
        .setTitle('QuickRent API')
        .setDescription('Global rental super app API')
        .setVersion('1.0.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup(`${env.API_PREFIX}/docs`, app, document);
    await app.listen(env.API_PORT);
}
void bootstrap();
