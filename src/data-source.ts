// internship-platform-backend/src/data-source.ts
import 'reflect-metadata'; // Must be imported at the very top
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { User } from './users/entities/users.entity'; 
// This file is used by the TypeORM CLI for migrations
const configService = new ConfigService();
dotenv.config(); // Load environment variables

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get<string>('DB_HOST'),
  port: configService.get<number>('DB_PORT'),
  username: configService.get<string>('DB_USERNAME'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_DATABASE'),
  entities: [User], // List entities to include in migration
  migrations: [__dirname + '/migrations/*.ts'], // Location of migration files
});