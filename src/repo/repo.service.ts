import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Repo } from './entities/repo.entity';
import { Intern } from '../interns/entities/intern.entity';
import { CreateRepoDto } from './dto/create-repo.dto';

@Injectable()
export class RepoService {
  constructor(
    @InjectRepository(Repo) private readonly repoRepo: Repository<Repo>,
    @InjectRepository(Intern) private readonly internRepo: Repository<Intern>,
  ) {}

  async create(internId: string, dto: CreateRepoDto) {
    const intern = await this.internRepo.findOne({ where: { id: internId } });
    if (!intern) throw new NotFoundException('Intern not found');
    const repo = this.repoRepo.create({ ...dto, intern });
    return this.repoRepo.save(repo);
  }

  async findAll(internId: string) {
    return this.repoRepo.find({ where: { intern: { id: internId } }, relations: ['commits'] });
  }
}
