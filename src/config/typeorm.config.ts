// src/config/typeorm.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/users.entity';
import { Project } from '../projects/entities/project.entity';
import { Milestone } from '../milestones/entities/milestone.entity';
import { Task } from '../projects/entities/task.entity';
import { Session } from '../session/session.entity'; // Make sure all entities are imported

export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST'),
    port: parseInt(configService.get<string>('DB_PORT', '5432'), 10), // Ensure port is a number
    username: configService.get<string>('intern_app_users'), // Use DB_USERNAME from .env
    password: configService.get<string>('intern%4012'), // Use DB_PASSWORD from .env
    database: configService.get<string>('internship_platform'), // Use DB_DATABASE from .env
    entities: [User, Project, Milestone, Task, Session], // List all your entities here
    synchronize: configService.get<string>('NODE_ENV') === 'development', // Use synchronize only in dev
    logging: configService.get<string>('NODE_ENV') === 'development' ? ['query', 'error'] : ['error'],
  };
};