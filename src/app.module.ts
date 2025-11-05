import { Module, OnModuleInit, MiddlewareConsumer, RequestMethod, NestModule } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { RequestLoggerMiddleware } from './common/middleware/request.logger.middleware';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'; // CRITICAL FIX: Keep import for middleware
import { RolesGuard } from './auth/guards/roles.guard';
// --- Import Feature Modules ---
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { ChecklistsModule } from './checklists/checklists.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { GithubModule } from './github/github.module';
import { ReportsModule } from './reports/reports.module';
import { MockModule } from './mock/mock.module';
import { TasksModule } from './tasks/tasks.module';
import { MilestonesModule } from './milestones/milestones.module'; 
// --- Import ALL Entities --- (CRITICAL FIX: Explicitly list all entities)
import { User } from './users/entities/users.entity';
import { Project } from './projects/entities/project.entity';
import { Milestone } from './projects/entities/milestone.entity';
import { Task } from './projects/entities/task.entity';
import { Evaluation } from './evaluations/entities/evaluation.entity';
import { InternChecklist } from './checklists/entities/intern-checklist.entity';
import { InternChecklistItem } from './checklists/entities/intern-checklist-item.entity';
import { ChecklistTemplate } from './checklists/entities/checklist-template.entity';
import { ChecklistTemplateItem } from './checklists/entities/checklist-template-item.entity';
import { Session } from './session/session.entity';
import { GitHubMetrics } from './github/entities/github-metrics.entity';
import { NlpSummary } from './analytics/entities/nlp-summary.entity';
import { Checklist } from './checklists/entities/checklist.entity'; 
import { ChecklistItem } from './checklists/entities/checklist-item.entity';
// --- Root App Components ---
import { AppController } from './app.controller';
import { AuthController } from './controller/auth.controller'; // CRITICAL: Import AuthController
import { UsersController } from './users/users.controller'; // CRITICAL: Import UsersController
import { ProjectsController } from './projects/projects.controller'; // CRITICAL: Import ProjectsController
import { MilestonesController } from './milestones/milestones.controller'; // CRITICAL: Import MilestonesController
import { TasksController } from './tasks/tasks.controller'; // CRITICAL: Import TasksController
import { ChecklistsController } from './checklists/checklists.controller'; // CRITICAL: Import ChecklistsController
import { EvaluationsController } from './evaluations/evaluations.controller'; // CRITICAL: Import EvaluationsController
import { AnalyticsController } from './analytics/analytics.controller'; // CRITICAL: Import AnalyticsController
import { GithubController } from './github/github.controller'; // CRITICAL: Import GithubController
import { ReportsController } from './reports/reports.controller'; // CRITICAL: Import ReportsController

import { AppService } from './app.service';
import { UserRole } from './common/enums/user-role.enum';


const ENTITIES = [
   User, Project, Milestone, Task, Evaluation,
  InternChecklist, InternChecklistItem, ChecklistTemplate, ChecklistTemplateItem,
  Session, GitHubMetrics, NlpSummary, Checklist, ChecklistItem
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'], // Load .env.local first, then .env
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres', // CRITICAL FIX: Hardcoded as postgres based on your setup
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        schema: 'public', // Default schema for PostgreSQL
        synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true', // Use 'true'/'false' strings
        logging: configService.get<string>('DB_LOGGING') === 'true' ? ['query', 'error'] : ['error'],
          entities: ENTITIES,// CRITICAL FIX: Use the ENTITIES array here
        autoLoadEntities: true, // Auto-load entities found in the project (can simplify entities array)
        ssl: configService.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiresInValue = configService.get<string>('JWT_EXPIRES_IN') || '7d';
        if (!secret) {
          console.error('!!! FATAL: JWT_SECRET environment variable is not set. !!!');
          return { secret: 'INSECURE_FALLBACK_SECRET_DO_NOT_USE_IN_PRODUCTION', signOptions: { expiresIn: '1h' } };
        }
        return { secret: secret, signOptions: { expiresIn: expiresInValue as any } };
      },
    }),

    // --- Feature Modules ---
        UsersModule,
    AuthModule,
    ProjectsModule,
    EvaluationsModule,
    ChecklistsModule,
    AnalyticsModule,
    GithubModule,
    ReportsModule,
    MockModule,
    PassportModule,
    MilestonesModule, // CRITICAL: Ensure MilestonesModule is imported
    TasksModule,      // CRITICAL: Ensure TasksModule is imported
    TypeOrmModule.forFeature([User]),
  ],
   controllers: [
    AppController,
    AuthController,
    UsersController,
    ProjectsController,
    MilestonesController,
    TasksController,
    ChecklistsController,
    EvaluationsController,
    AnalyticsController,
    GithubController,
    ReportsController,
  ],
  providers: [
    // 1. Standard class provider (AppService)
    AppService, 

    // 2. Factory provider for RolesGuard (CRITICAL FIX: Everything enclosed in one object)
    { 
        // This tells NestJS: "Provide the RolesGuard class..."
        provide: APP_GUARD, 
        
        // ...but use this function (factory) to create the instance.
        useFactory: (reflector: Reflector) => new RolesGuard(reflector), 
        
        // ...and you need to inject Reflector to run the function.
        inject: [Reflector], 
    },
    
  ]
})
export class AppModule implements NestModule, OnModuleInit {

    constructor(@InjectRepository(User) private readonly userRepository: Repository<User>) {}

    // CRITICAL FIX: Implement JWT exclusion logic using MiddlewareConsumer
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestLoggerMiddleware).forRoutes('*'); // Apply logger globally

        consumer
            .apply(JwtAuthGuard)
            .exclude(
                { path: 'api/auth/login', method: RequestMethod.POST },
                { path: 'api/auth/register', method: RequestMethod.POST },
                { path: 'api/users/setup-initial-user', method: RequestMethod.POST },
                { path: 'api', method: RequestMethod.GET }, // Allow root /api to be public
            )
            .forRoutes(
                { path: 'api/(.*)', method: RequestMethod.ALL } // Apply to all other API routes
            );
    }

    async onModuleInit() {
        console.log('[DefaultUsersSetup] Checking/Creating default users...');
        const defaultUsers = [
            { email: 'hr@company.com', role: UserRole.HR, firstName: 'HR', lastName: 'Admin', defaultPassword: 'password1s' },
            { email: 'mentor@company.com', role: UserRole.MENTOR, firstName: 'Mentor', lastName: 'Lead', defaultPassword: 'password1s' },
            { email: 'intern@company.com', role: UserRole.INTERN, firstName: 'Intern', lastName: 'User', defaultPassword: 'password1s' },
            { email: 'observer@company.com', role: UserRole.OBSERVER, firstName: 'Observer', lastName: 'Watcher', defaultPassword: 'password1s' }, // Add observer
        ];
        const saltRounds = 10;

        for (const userData of defaultUsers) {
            try {
                const user = await this.userRepository.findOneBy({ email: userData.email });
                const hashedPassword = await bcrypt.hash(userData.defaultPassword, saltRounds);

                if (!user) {
                    const newUser = this.userRepository.create({
                        email: userData.email,
                        passwordHash: hashedPassword,
                        role: userData.role,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                    });
                    await this.userRepository.save(newUser);
                    console.log(`[DefaultUsersSetup] Created default ${userData.role} user: ${userData.email}`);
                } else {
                    // Update existing user's password and role if it's a default user
                    const isPasswordMatch = await bcrypt.compare(userData.defaultPassword, user.passwordHash);
                    if (!isPasswordMatch || user.role !== userData.role) {
                        await this.userRepository.update(user.id, {
                            passwordHash: hashedPassword,
                            role: userData.role,
                        });
                        console.warn(`[DefaultUsersSetup] Updated default ${userData.role} user: ${userData.email} (password/role reset).`);
                    } else {
                        console.log(`[DefaultUsersSetup] Default ${userData.role} user already exists and is up-to-date: ${userData.email}.`);
                    }
                }
            } catch (error) {
                console.error(`[DefaultUsersSetup] Error processing user ${userData.email}:`, error);
            }
        }
        console.log('[DefaultUsersSetup] Default users check/creation complete.');
    }
}