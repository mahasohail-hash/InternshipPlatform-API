import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
 
  host: configService.get<string>('DB_HOST'),
   type: configService.get<string>('DB_TYPE') as 'postgres',
  port: configService.get<number>('DB_PORT'),
  username: configService.get<string>('DB_USERNAME'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_NAME'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: configService.get<boolean>('SYNCHRONIZE'), // todo: while turning this off, do go over queryRunner docs as we need this as well to perform rollback (eg in case of creating transactions and JVs)
  logging: process.env.NODE_ENV !== 'production',
  // Enable SSL for cloud DBs if DB_SSL=true
  ssl: configService.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
});
