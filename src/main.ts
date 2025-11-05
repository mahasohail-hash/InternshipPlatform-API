import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users/users.service';
import { UserRole } from './common/enums/user-role.enum';
import { ValidationPipe, INestApplication, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CreateUserDto } from './users/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
async function setupAndCreateDefaultUsers(app: INestApplication) {
  const logger = new Logger('DefaultUsersSetup');
  const usersService = app.get(UsersService);
  const DEFAULT_PASSWORD = 'password123';

  const defaultUsersData: CreateUserDto[] = [
    { email: 'hr@company.com', role: UserRole.HR, firstName: 'Default', lastName: 'HR', password: DEFAULT_PASSWORD },
    { email: 'mentor@company.com', role: UserRole.MENTOR, firstName: 'Default', lastName: 'Mentor', password: DEFAULT_PASSWORD },
    { email: 'intern@company.com', role: UserRole.INTERN, firstName: 'Default', lastName: 'Intern', password: DEFAULT_PASSWORD },
    { email: 'observer@company.com', role: UserRole.OBSERVER, firstName: 'Default', lastName: 'Observer', password: DEFAULT_PASSWORD },
  ];

  logger.log('Checking/Creating default users...');

  for (const userData of defaultUsersData) {
    try {
      const existingUser = await usersService.findOneByEmail(userData.email);

      // CRITICAL FIX for bcrypt error: Only compare if passwordHash exists
      if (existingUser && existingUser.passwordHash) {
        const isPasswordMatch = await bcrypt.compare(userData.password, existingUser.passwordHash); // Compare plain with hashed
        if (!isPasswordMatch || existingUser.role !== userData.role) {
          await usersService._internal_forcePasswordReset(existingUser.id, userData.password, userData.role); // Use userData.password for reset
          logger.warn(`Default user exists: ${userData.email}. Password forcibly reset and role updated to '${userData.role}'.`);
        } else {
          logger.log(`Default user exists: ${userData.email}. Password and role are up-to-date.`);
        }
      } else if (!existingUser) { // User does not exist, create new
        await usersService.create(userData);
        logger.log(`Default user created: ${userData.email} with role '${userData.role}'.`);
      } else { // User exists but passwordHash is null/undefined, force reset
        await usersService._internal_forcePasswordReset(existingUser.id, userData.password, userData.role);
        logger.warn(`Default user exists but had no passwordHash: ${userData.email}. Password forcibly reset and role updated to '${userData.role}'.`);
      }
    } catch (error) {
      logger.error(`Error during setup for ${userData.email}: ${error instanceof Error ? error.message : error}`);
    }
  }
  logger.log('Default users check/creation complete.');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = new Logger('Bootstrap');

  // --- Global Configuration ---
  app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
          enableImplicitConversion: true,
      },
  }));

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  // --- CORS ---
  // CRITICAL FIX: Use a function for origin to match both localhost and 127.0.0.1
  // CRITICAL FIX: AllowedHeaders to include all common ones, and wildcard for robustness
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3000', // Frontend default
        'http://127.0.0.1:3000', // Frontend alternative
        'http://localhost:3001', // Backend itself
        'http://127.0.0.1:3001', // Backend alternative
      ];
      
      // Normalize origins (remove trailing slashes and convert to lowercase for comparison)
      const normalizeOrigin = (orig: string) => {
        let normalized = orig.toLowerCase();
        if (normalized.endsWith('/')) {
          normalized = normalized.slice(0, -1);
        }
        return normalized;
      };
      
      // Allow requests with no origin (like Postman, curl, mobile apps, or file://) for development
      if (!origin) {
        logger.log('CORS: Request with no origin header - allowing for development');
        callback(null, true);
        return;
      }
      
      const normalizedOrigin = normalizeOrigin(origin);
      const isAllowed = allowedOrigins.some(allowed => normalizeOrigin(allowed) === normalizedOrigin);
      
      if (isAllowed) {
        logger.log(`CORS: Allowing request from origin: ${origin}`);
        callback(null, true);
      } else {
        logger.error(`CORS: Blocked request from origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    // CRITICAL FIX: Allow all common headers for robustness - use array format for better compatibility
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'X-Requested-With',
      'Origin',
      'X-CSRF-Token',
      'Referer',
      'sec-ch-ua',
      'sec-ch-ua-mobile',
      'sec-ch-ua-platform',
      'User-Agent',
      'Accept-Language',
      'Accept-Encoding',
      'Expires', // CRITICAL: Frontend sends this header
    ],
    exposedHeaders: ['Content-Disposition'], // For file downloads
    preflightContinue: false, // Ensure preflight response is handled here
    optionsSuccessStatus: 204, // Some browsers expect 204 for OPTIONS success
    maxAge: 86400, // Cache preflight requests for 24 hours
  });

  // --- Global API Prefix ---
  app.setGlobalPrefix('api');

  // --- Default User Setup ---
  await setupAndCreateDefaultUsers(app);

  // --- Start Listening ---
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);
  logger.log(`🚀 Application is running on: ${await app.getUrl()}`);
}

bootstrap();