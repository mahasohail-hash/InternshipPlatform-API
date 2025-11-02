import { Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { QueryFailedError } from 'typeorm'; // Import TypeORM error

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // 1. Determine the HTTP Status Code
    const status = 
      exception instanceof HttpException
        ? exception.getStatus()
        : exception instanceof QueryFailedError
        ? HttpStatus.INTERNAL_SERVER_ERROR // Treat DB failures as 500
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = 
      exception instanceof HttpException
        ? exception.message
        : exception instanceof Error 
        ? exception.message 
        : String(exception);

    // 2. 🛑 LOG THE RAW EXCEPTION FOR DEBUGGING
    this.logger.error(
      `[${status}] Path: ${request.url} | Error: ${message}`,
      (exception as Error).stack, // Log the full stack trace
    );
    
    // 3. Send a clear, sanitized response to the client
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      // Provide a generic message unless debugging locally
      message: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal server error (Check backend logs).' : message,
    });
  }
}