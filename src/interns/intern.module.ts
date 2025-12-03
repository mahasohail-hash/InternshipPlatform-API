import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Intern } from './entities/intern.entity';
import { InternService } from './intern.service';
import { InternController } from './intern.controller';
import { UsersModule } from '@/users/users.module';
import { ChecklistsModule } from '@/checklists/checklists.module';
import { GithubModule } from '@/github/github.module';
import { ProjectsModule } from '@/projects/projects.module';
import { MentorsModule } from '@/mentor/mentors.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Intern]),
    forwardRef(() => UsersModule),        // For linking HR/User entity
    forwardRef(() => ChecklistsModule),   // For checklist assignments
    forwardRef(() => GithubModule),       // For GitHub integration
    forwardRef(() => ProjectsModule),     // For linking intern projects
    forwardRef(() => MentorsModule),      // For linking intern mentors
  ],
  controllers: [InternController],
  providers: [InternService],
  exports: [InternService],
})
export class InternModule {}
