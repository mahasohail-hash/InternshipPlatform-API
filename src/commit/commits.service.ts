import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commit } from './entities/commit.entity';
import { Repo } from '../repo/entities/repo.entity';
import { CreateCommitDto } from './dto/create-commit.dto';

@Injectable()
export class CommitsService {
  constructor(
    @InjectRepository(Commit) private readonly commitRepo: Repository<Commit>,
    @InjectRepository(Repo) private readonly repoRepo: Repository<Repo>,
  ) {}

  async create(repoId: string, dto: CreateCommitDto) {
    const repo = await this.repoRepo.findOne({ where: { id: repoId } });
    if (!repo) throw new NotFoundException('Repo not found');
    const commit = this.commitRepo.create({ ...dto, repo });
    return this.commitRepo.save(commit);
  }

  async findAll(repoId: string) {
    return this.commitRepo.find({ where: { repo: { id: repoId } } });
  }
}
