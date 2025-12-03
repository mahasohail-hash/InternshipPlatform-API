// src/main.ts
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users/users.service';
import { UserRole } from './common/enums/user-role.enum';
import { ValidationPipe, INestApplication, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CreateUserDto } from './users/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import session from 'express-session';
import passport from 'passport';

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

      if (existingUser) {
        await usersService.forcePasswordReset(existingUser.id, userData.password, userData.role!);
        logger.warn(`Default user exists: ${userData.email}. Password and role forcibly reset.`);
      } else {
        await usersService.createUser(userData);
        logger.log(`Default user created: ${userData.email} with role '${userData.role}'.`);
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

  // --- Global Pipes ---
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // --- Session & Passport ---
  app.use(
    session({
      secret: 'H0LA7uaGUwf2Rg9F2gFVhBVeTI7Pt/pPMcK82/ZpbK8=',
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 3600000 },
    }),
  );

  app.use(passport.initialize());

  // --- Global Exception Filter ---
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  // --- CORS ---
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
      ];

      if (!origin) return callback(null, true); // Postman, curl, mobile apps

      const normalize = (url: string) => url.toLowerCase().replace(/\/$/, '');
      const isAllowed = allowedOrigins.some(o => normalize(o) === normalize(origin));

      if (isAllowed) callback(null, true);
      else callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 'Accept', 'Authorization', 'Cache-Control', 'X-Requested-With',
      'Origin', 'X-CSRF-Token', 'Referer', 'sec-ch-ua', 'sec-ch-ua-mobile',
      'sec-ch-ua-platform', 'User-Agent', 'Accept-Language', 'Accept-Encoding', 'Expires'
    ],
    exposedHeaders: ['Content-Disposition'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400,
  });

  // --- Global API Prefix ---
  app.setGlobalPrefix('api');

  // --- Default Users ---
  await setupAndCreateDefaultUsers(app);

  // --- Start Server ---
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);
  logger.log(`🚀 Application is running on: ${await app.getUrl()}`);
}

bootstrap();
