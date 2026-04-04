import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse();
    const request = context.getRequest<{ method: string; url: string }>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    this.logger.error(`${request.method} ${request.url}`, exception instanceof Error ? exception.stack : String(exception));

    response.status(status).json({
      success: false,
      statusCode: status,
      path: request.url,
      message: exceptionResponse,
      timestamp: new Date().toISOString(),
    });
  }
}