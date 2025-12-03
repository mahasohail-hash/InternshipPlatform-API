import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repo } from './entities/repo.entity';
import { RepoService } from './repo.service';
import { RepoController } from './repo.controller';
import { Intern } from '../interns/entities/intern.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Repo, Intern])],
  providers: [RepoService],
  controllers: [RepoController],
  exports: [RepoService],
})
export class RepoModule {}
