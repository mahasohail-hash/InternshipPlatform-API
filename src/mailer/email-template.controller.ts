import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards } from "@nestjs/common";

import { EmailTemplateService } from "./email-template.service";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";
import { Roles } from "@/auth/decorators/roles.decorator";
import { RolesGuard } from "@/auth/guards/roles.guard";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { UserRole } from "@/common/enums/user-role.enum";

@Controller("api/email/templates")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
export class EmailTemplateController {
  constructor(private templateService: EmailTemplateService) {}

  @Post()
  async create(@Body() dto: CreateTemplateDto) {
    return this.templateService.create(dto);
  }

  @Get()
  async findAll() {
    return this.templateService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.templateService.findOne(id);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateTemplateDto) {
    return this.templateService.update(id, dto);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.templateService.delete(id);
  }
}
