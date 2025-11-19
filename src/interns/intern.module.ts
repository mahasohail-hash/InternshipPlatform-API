import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/users.entity'; // Import User entity
import { InternController } from './intern.controller';
import { InternService } from './intern.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])], // Use User entity
  controllers: [InternController],
  providers: [InternService],
  exports: [InternService],
})
export class InternModule {}
