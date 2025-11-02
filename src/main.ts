import { NestFactory,HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users/users.service'; // Ensure path is correct
import { UserRole } from './common/enums/user-role.enum';
import { CreateUserDto } from './users/dto/create-user.dto'; // Ensure path is correct
import { ValidationPipe, INestApplication, Logger } from '@nestjs/common'; // Added Logger
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'; 
// --- THIS IS THE FIX ---
// Corrected the typo in the function name
async function setupDefaultUsers(app: INestApplication) {
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));
// --- END FIX ---
  const logger = new Logger('DefaultUsersSetup');
  try {
    const usersService = app.get(UsersService);
    const DEFAULT_PASSWORD = 'password123'; // Consider moving to config/env

    const defaultUsersData = [
      { email: 'hr@company.com', role: UserRole.HR, firstName: 'Default', lastName: 'HR' },
      { email: 'mentor@company.com', role: UserRole.MENTOR, firstName: 'Default', lastName: 'Mentor' },
      { email: 'intern@company.com', role: UserRole.INTERN, firstName: 'Default', lastName: 'Intern' },
    ];

    logger.log('Checking/Creating default users...');

    for (const userData of defaultUsersData) {
      try {
        const existingUser = await usersService.findOneByEmail(userData.email);

        if (!existingUser) {
          const userDto: CreateUserDto = {
            email: userData.email,
            password: DEFAULT_PASSWORD,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
          };
          await usersService.create(userDto);
          logger.log(`Default user created: ${userData.email} with password '${DEFAULT_PASSWORD}'`);
        } else {
          // User exists - Force reset password and role
          await usersService._internal_forcePasswordReset(existingUser.id, DEFAULT_PASSWORD, userData.role);
          logger.warn(`Default user exists: ${userData.email}. Password forcibly reset to '${DEFAULT_PASSWORD}' and role set to ${userData.role}.`);
        }
      } catch (error) {
        logger.error(`Error during setup for ${userData.email}: ${error instanceof Error ? error.message : error}`);
      }
    }
    logger.log('Default users check/creation complete.');

  } catch (error) {
    logger.error(`FATAL ERROR during default users setup: ${error instanceof Error ? error.message : error}`);
  }
}


// Main bootstrap function
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap'); // Logger for bootstrap process

  // --- Global Configuration ---
  app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
          enableImplicitConversion: true,
      },
  }));
         
  // --- CORS ---
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Use environment variable
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // --- Global API Prefix ---
  app.setGlobalPrefix('api');

  // --- Default User Setup ---
  // This line now correctly calls the function defined above
  await setupDefaultUsers(app);

  // --- Start Listening ---
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3001;
  await app.listen(3001);
  logger.log(`🚀 Application is running on: ${await app.getUrl()}`);
}

// Start the application
bootstrap();

