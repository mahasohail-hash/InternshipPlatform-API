// src/app.module.ts
import { Module, OnModuleInit, MiddlewareConsumer, RequestMethod, NestModule } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config'; // <-- Import ConfigModule here
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { RequestLoggerMiddleware } from './common/middleware/request.logger.middleware';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
// --- Import Feature Modules ---
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { ChecklistsModule } from './checklists/checklists.module';
import { AnalyticsModule } from './analytics/analytics.module'; // <-- Import

// --- Import ALL Entities ---
import { User } from './users/entities/users.entity';
import { Project } from './projects/entities/project.entity';
import { Milestone } from './projects/entities/milestone.entity';
import { Task } from './projects/entities/task.entity';
import { Evaluation } from './evaluations/entities/evaluation.entity';
import { Checklist } from './checklists/entities/checklist.entity';
import { ChecklistItem } from './checklists/entities/checklist-item.entity';
import { ChecklistTemplate } from './checklists/entities/checklist-template.entity';
import { ChecklistTemplateItem } from './checklists/entities/checklist-template-item.entity';
import { Session } from './session/session.entity';
import { UserRole } from './common/enums/user-role.enum'; // <-- Import UserRole
import { UsersController } from './users/users.controller';
// --- Array of ALL entities in the application ---
// Using this array explicitly is safer than autoLoadEntities
const ENTITIES = [
  User,
  Project,
  Milestone,
  Task,
  Evaluation,
  Checklist,
  ChecklistItem,
  ChecklistTemplate,
  ChecklistTemplateItem,
  Session,
  UsersModule
];

@Module({
  imports: [
    // 1. Configure ConfigModule globally and first
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 2. Configure TypeORM (Database)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // Import ConfigModule to use ConfigService
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: configService.get<any>('DB_TYPE'),
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        schema: 'public',
        synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true',
        logging: configService.get<string>('DB_LOGGING') === 'true',
         entities: [], 
        autoLoadEntities: true,  
    }),
  }),

    // 3. Configure JWT Module (Authentication)
    //    This was incorrectly nested inside TypeOrmModule before
    JwtModule.registerAsync({
      imports: [ConfigModule], // Import ConfigModule to use ConfigService
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<JwtModuleOptions> => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiresInValue =
          configService.get<string>('JWT_EXPIRES_IN') || '7d';

        if (!secret) {
          console.error(
            '!!! FATAL: JWT_SECRET environment variable is not set. !!!',
          );
        }

        return {
          secret: secret,
          signOptions: {
            expiresIn: expiresInValue as any, // Cast to 'any' to bypass TS error
          },
        };
      },
    }),

    // 4. Import all your feature modules
    UsersModule,
    AuthModule,
    ProjectsModule,
    EvaluationsModule,
    ChecklistsModule,
    PassportModule,
 AnalyticsModule,
    // 5. Import User entity for OnModuleInit logic
    // This is required for @InjectRepository(User) in the AppModule
    TypeOrmModule.forFeature([User]),
  ],
  // AppModule typically doesn't have its own controllers or services
  controllers: [UsersController],
  providers: [
    
  ],
})
export class AppModule implements NestModule, OnModuleInit {
    
    constructor(
        // InjectRepository is used inside the class where TypeOrmModule.forFeature([User]) is imported
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    // 🛑 FIX 2: Implement JWT exclusion logic using MiddlewareConsumer
    configure(consumer: MiddlewareConsumer) {
        // 1. Apply the Request Logger Middleware globally
        consumer.apply(RequestLoggerMiddleware).forRoutes('*'); 
        
        // 2. Apply the JwtAuthGuard to ALL routes EXCEPT the login/setup routes
        // We apply the guard here as middleware to use the .exclude() feature.
        // NOTE: The Guards must be removed from the providers array above for this to work cleanl
        consumer
            .apply(JwtAuthGuard)
            .exclude(
                { path: 'api/auth/login', method: RequestMethod.POST },
               { path: 'api/auth/signin', method: RequestMethod.POST },
                { path: 'api/auth/register', method: RequestMethod.POST },
                { path: 'api/users/setup-initial-user', method: RequestMethod.POST },
            )
            .forRoutes(
                // Apply the guard to all other API paths
                { path: 'api/(.*)', method: RequestMethod.ALL }
            );
        // NOTE: RolesGuard still needs to be applied at the controller/method level
    }

    // 🛑 FIX 3: Keep the OnModuleInit logic for default user setup
    async onModuleInit() {
        console.log('[DefaultUsersSetup] Checking/Creating default users...');
        const defaultUsers = [
            // ... Your default user definitions ...
            {
                email: 'hr@company.com',
                role: UserRole.HR,
                firstName: 'HR',
                lastName: 'Admin',
                defaultPassword: 'password1s',
            },
            {
                email: 'mentor@company.com',
                role: UserRole.MENTOR,
                firstName: 'Mentor',
                lastName: 'Lead',
                defaultPassword: 'password1s',
            },
            {
                email: 'intern@company.com',
                role: UserRole.INTERN,
                firstName: 'Intern',
                lastName: 'User',
                defaultPassword: 'password1s',
            },
        ];
        const saltRounds = 10;

        for (const userData of defaultUsers) {
            try {
                const user = await this.userRepository.findOneBy({ email: userData.email, });
                const hashedPassword = await bcrypt.hash(userData.defaultPassword, saltRounds);

                if (!user) {
                    const newUser = this.userRepository.create({
                        email: userData.email,
                        password: hashedPassword,
                        role: userData.role,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                    });
                    await this.userRepository.save(newUser);
                    console.log(`[DefaultUsersSetup] Created default user: ${userData.email}`);
                } else {
                    console.warn(`[DefaultUsersSetup] Default user exists: ${userData.email}. Password forcibly reset.`);
                    await this.userRepository.update(user.id, {
                        password: hashedPassword,
                        role: userData.role,
                    });
                }
            } catch (error) {
                console.error(`[DefaultUsersSetup] Error processing user ${userData.email}:`, error);
            }
        }
        console.log('[DefaultUsersSetup] Default users check/creation complete.');
    }
}