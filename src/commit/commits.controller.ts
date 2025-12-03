import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { CommitsService } from './commits.service';
import { CreateCommitDto } from './dto/create-commit.dto';

@Controller('commits')
export class CommitsController {
  constructor(private readonly commitsService: CommitsService) {}

  @Post(':repoId')
  async create(@Param('repoId') repoId: string, @Body() dto: CreateCommitDto) {
    return this.commitsService.create(repoId, dto);
  }

  @Get(':repoId')
  async findAll(@Param('repoId') repoId: string) {
    return this.commitsService.findAll(repoId);
  }
}
