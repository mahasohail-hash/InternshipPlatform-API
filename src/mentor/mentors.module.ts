import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mentor } from './entities/mentor.entity';
import { MentorsController } from './mentor.controller';
import { MentorsService } from './mentor.service';
import { UsersModule } from '../users/users.module';
import { EvaluationsModule } from '../evaluations/evaluations.module';
import { ProjectsModule } from '../projects/projects.module';
import { ChecklistsModule } from '../checklists/checklists.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mentor]),
    forwardRef(() => UsersModule),
    forwardRef(() => EvaluationsModule),
    forwardRef(() => ProjectsModule),
    forwardRef(() => ChecklistsModule),
  ],
  providers: [MentorsService],
  controllers: [MentorsController],
  exports: [MentorsService],
})
export class MentorsModule {}
