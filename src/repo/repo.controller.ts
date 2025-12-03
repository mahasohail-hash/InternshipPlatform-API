import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { RepoService } from './repo.service';
import { CreateRepoDto } from './dto/create-repo.dto';

@Controller('repos')
export class RepoController {
  constructor(private readonly repoService: RepoService) {}

  @Post(':internId')
  async create(@Param('internId') internId: string, @Body() dto: CreateRepoDto) {
    return this.repoService.create(internId, dto);
  }

  @Get(':internId')
  async findAll(@Param('internId') internId: string) {
    return this.repoService.findAll(internId);
  }
}
