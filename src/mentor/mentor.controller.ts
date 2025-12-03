import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
import { MentorsService } from './mentor.service';
import { CreateMentorDto } from './dto/create-mentor.dto';
import { UpdateMentorDto } from './dto/update-mentor.dto';

@Controller('mentors')
export class MentorsController {
  constructor(private readonly mentorService: MentorsService) {}

  @Post()
  async create(@Body() dto: CreateMentorDto) {
    return this.mentorService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateMentorDto) {
    return this.mentorService.update(id, dto);
  }

  @Get()
  async findAll() {
    return this.mentorService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.mentorService.findOne(id);
  }
}
