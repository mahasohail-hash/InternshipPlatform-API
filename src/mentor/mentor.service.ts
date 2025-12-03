import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mentor } from './entities/mentor.entity';
import { CreateMentorDto } from './dto/create-mentor.dto';
import { UpdateMentorDto } from './dto/update-mentor.dto';

@Injectable()
export class MentorsService {
  constructor(
    @InjectRepository(Mentor) private readonly mentorRepo: Repository<Mentor>,
  ) {}

  async create(dto: CreateMentorDto) {
    const mentor = this.mentorRepo.create(dto);
    return this.mentorRepo.save(mentor);
  }

  async update(id: string, dto: UpdateMentorDto) {
    const mentor = await this.mentorRepo.findOne({ where: { id } });
    if (!mentor) throw new NotFoundException('Mentor not found');
    Object.assign(mentor, dto);
    return this.mentorRepo.save(mentor);
  }

  async findAll() {
    return this.mentorRepo.find({ relations: ['interns', 'givenEvaluations', 'projects', 'assignedChecklists'] });
  }

  async findOne(id: string) {
    const mentor = await this.mentorRepo.findOne({ 
      where: { id },
      relations: ['interns', 'givenEvaluations', 'projects', 'assignedChecklists'],
    });
    if (!mentor) throw new NotFoundException('Mentor not found');
    return mentor;
  }
}
