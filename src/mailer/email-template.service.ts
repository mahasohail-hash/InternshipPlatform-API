import { Injectable, NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { EmailTemplate } from "./entities/email-template.entity";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";

@Injectable()
export class EmailTemplateService {
  constructor(
    @InjectRepository(EmailTemplate)
    private templateRepo: Repository<EmailTemplate>
  ) {}

  async create(dto: CreateTemplateDto) {
    const template = this.templateRepo.create(dto);
    return this.templateRepo.save(template);
  }

  async findAll(draftsOnly = false) {
    return this.templateRepo.find({ where: draftsOnly ? { isDraft: true } : {} });
  }

  async findOne(id: string) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException("Template not found");
    return template;
  }

  async update(id: string, dto: UpdateTemplateDto) {
    await this.findOne(id);
    await this.templateRepo.update(id, dto);
    return this.findOne(id);
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.templateRepo.delete(id);
  }
}
