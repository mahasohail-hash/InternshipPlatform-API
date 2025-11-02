import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, headers } = req;
    
    // Log the incoming request details (STEP 1)
    this.logger.log(`[INCOMING] ${method} ${originalUrl} - Auth: ${headers.authorization ? 'Present' : 'Missing'}`);

    // Attach a listener to log the response status (STEP 2)
    res.on('finish', () => {
      const { statusCode } = res;
      if (statusCode === 404) {
        // 🛑 CRITICAL LOGGING FOR THE 404 ERROR
        this.logger.error(`[404 NOT FOUND] ${method} ${originalUrl} - Status: ${statusCode}. Investigate Guard/Middleware failure.`);
      } else {
        this.logger.log(`[RESPONSE] ${method} ${originalUrl} - Status: ${statusCode}`);
      }
    });

    next();
  }
}