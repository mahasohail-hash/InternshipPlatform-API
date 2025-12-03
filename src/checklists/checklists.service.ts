import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { ChecklistTemplate } from './entities/checklist-template.entity';
import { ChecklistTemplateItem } from './entities/checklist-template-item.entity';
import { Checklist } from './entities/checklist.entity';
import { ChecklistItem } from './entities/checklist-item.entity';
import { InternChecklist } from './entities/intern-checklist.entity';
import { InternChecklistItem } from './entities/intern-checklist-item.entity';
import { User } from '@/users/entities/users.entity';
import { Intern } from '@/interns/entities/intern.entity';
import { CreateChecklistTemplateDto } from './dto/create-checklist-template.dto';
import { UpdateChecklistTemplateDto } from './dto/update-checklist-template.dto';
import { AssignChecklistsDto } from './dto/assign-checklist.dto';


@Injectable()
export class ChecklistsService {
  private readonly logger = new Logger(ChecklistsService.name);

  constructor(
    @InjectRepository(ChecklistTemplate) private readonly templateRepo: Repository<ChecklistTemplate>,
    @InjectRepository(ChecklistTemplateItem) private readonly templateItemRepo: Repository<ChecklistTemplateItem>,
    @InjectRepository(Checklist) private readonly checklistRepo: Repository<Checklist>,
    @InjectRepository(ChecklistItem) private readonly checklistItemRepo: Repository<ChecklistItem>,
    @InjectRepository(InternChecklist) private readonly internChecklistRepo: Repository<InternChecklist>,
    @InjectRepository(InternChecklistItem) private readonly internChecklistItemRepo: Repository<InternChecklistItem>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Intern) private readonly internRepo: Repository<Intern>,
    private readonly dataSource: DataSource,
  ) {}

  /** ---------------- Templates ---------------- */
  async findAllTemplates() {
    return this.templateRepo.find({ relations: ['items'], order: { name: 'ASC' } });
  }

  async findTemplateById(id: string) {
    const template = await this.templateRepo.findOne({ where: { id }, relations: ['items'] });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async createTemplate(dto: CreateChecklistTemplateDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Template name required');
    const existing = await this.templateRepo.findOne({ where: { name } });
    if (existing) throw new BadRequestException('Template name already exists');

    return this.dataSource.transaction(async manager => {
      const tpl = manager.create(ChecklistTemplate, {
        name,
        description: dto.description?.trim() ?? null,
      });
      const savedTpl = await manager.save(tpl);

      const items = dto.items.map(i =>
        manager.create(ChecklistTemplateItem, {
          title: i.title.trim(),
          description: i.description?.trim() ?? null,
          text: (i as any).text ?? null,
          template: savedTpl,
          templateId: savedTpl.id,
        }),
      );
      if (items.length) await manager.save(items);

      return manager.findOne(ChecklistTemplate, { where: { id: savedTpl.id }, relations: ['items'] });
    });
  }

  async updateTemplate(id: string, dto: UpdateChecklistTemplateDto) {
    const template = await this.templateRepo.findOne({ where: { id }, relations: ['items'] });
    if (!template) throw new NotFoundException('Template not found');

    return this.dataSource.transaction(async manager => {
      template.name = dto.name?.trim() ?? template.name;
      template.description = dto.description?.trim() ?? template.description;
      await manager.save(template);

      if (dto.items) {
        const incomingIds = dto.items.map(i => i.id).filter(Boolean) as string[];

        // Delete items not in incoming list
        await manager
          .createQueryBuilder()
          .delete()
          .from(ChecklistTemplateItem)
          .where('templateId = :id', { id })
          .andWhere(incomingIds.length ? 'id NOT IN (:...incomingIds)' : '1=0', { incomingIds })
          .execute()
          .catch(() => {});

        // Upsert items
        const itemsToUpsert = dto.items.map(i =>
          manager.create(ChecklistTemplateItem, {
            id: i.id,
            title: i.title?.trim() ?? 'Untitled',
            description: i.description?.trim() ?? null,
            template,
            templateId: id,
          }),
        );
        await manager.save(itemsToUpsert);
      }

      return manager.findOne(ChecklistTemplate, { where: { id }, relations: ['items'] });
    });
  }

  async deleteTemplate(id: string, options?: { force?: boolean }) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');

    const assignedCount = await this.internChecklistRepo.count({ where: { template: { id } } as any });
    if (assignedCount > 0 && !options?.force) {
      throw new BadRequestException('Template assigned to interns. Use force=true to delete.');
    }

    return this.dataSource.transaction(async manager => {
      if (assignedCount > 0) {
        const internChecklists = await manager.find(InternChecklist, { where: { template: { id } } as any });
        const icIds = internChecklists.map(ic => ic.id);
        if (icIds.length) {
          await manager.delete(InternChecklistItem, { internChecklist: In(icIds) } as any);
          await manager.delete(InternChecklist, { id: In(icIds) } as any);
        }
      }

      const checklists = await manager.find(Checklist, { where: { template: { id } } as any });
      const checklistIds = checklists.map(c => c.id);
      if (checklistIds.length) {
        await manager.delete(ChecklistItem, { checklistId: In(checklistIds) } as any);
        await manager.delete(Checklist, { id: In(checklistIds) } as any);
      }

      await manager.delete(ChecklistTemplateItem, { template: { id } } as any);
      await manager.delete(ChecklistTemplate, { id } as any);
    });
  }

  /** ---------------- Assignments ---------------- */
  async assignTemplatesToInterns(templateIds: string[], internIds: string[], hrUserId?: string) {
    if (!templateIds.length || !internIds.length) throw new BadRequestException('templateIds & internIds required');

    const templates = await this.templateRepo.find({ where: { id: In(templateIds) }, relations: ['items'] });
    if (!templates.length) throw new NotFoundException('Templates not found');

    const interns = await this.internRepo.find({ where: { id: In(internIds) }, relations: ['user'] });
    if (interns.length !== internIds.length) throw new NotFoundException('Some interns not found');

    return this.dataSource.transaction(async manager => {
      for (const intern of interns) {
        for (const template of templates) {
          const existingChecklist = await manager.findOne(Checklist, {
            where: { template: { id: template.id }, interns: { id: intern.id } } as any,
          });
          if (existingChecklist) continue;

          const checklist = manager.create(Checklist, {
            name: template.name,
            title: template.name,
            template,
            templateId: template.id,
            userId: hrUserId ?? null,
          });
          const savedChecklist = await manager.save(checklist);

          const checklistItems = (template.items || []).map(ti =>
            manager.create(ChecklistItem, {
              title: ti.title,
              description: ti.description,
              checklist: savedChecklist,
              checklistId: savedChecklist.id,
              templateId: ti.id,
              isCompleted: false,
            }),
          );
          if (checklistItems.length) await manager.save(checklistItems);

          const internChecklist = manager.create(InternChecklist, {
            checklist: savedChecklist,
            checklistId: savedChecklist.id,
            intern,
            internId: intern.id,
            template,
            templateId: template.id,
            isComplete: false,
          });
          const savedIC = await manager.save(internChecklist);

          const internItems = (checklistItems || []).map(ci =>
            manager.create(InternChecklistItem, {
              title: ci.title,
              description: ci.description,
              isCompleted: false,
              internChecklist: savedIC,
              internChecklistId: savedIC.id,
            }),
          );
          if (internItems.length) await manager.save(internItems);
        }
      }
    });
  }

  /** ---------------- Fetching ---------------- */
  async getChecklistsForIntern(internId: string) {
    return this.internChecklistRepo.find({
      where: { intern: { id: internId } } as any,
      relations: ['template', 'checklist', 'items', 'checklist.items'],
      order: { assignedAt: 'ASC' },
    });
  }

  async getAssignedChecklists(internId: string) {
    return this.internChecklistRepo.find({
      where: { intern: { id: internId } } as any,
      relations: ['template', 'items', 'checklist'],
    });
  }

  /** ---------------- Item operations ---------------- */
  async updateItemStatus(itemId: string, isCompleted: boolean, actorInternId?: string) {
    const item = await this.checklistItemRepo.findOne({ where: { id: itemId }, relations: ['checklist'] });
    if (!item) throw new NotFoundException('Checklist item not found');

    if (actorInternId) {
      const ic = await this.internChecklistRepo.findOne({
        where: { checklist: { id: item.checklist.id }, intern: { id: actorInternId } } as any,
      });
      if (!ic) throw new ForbiddenException('You are not allowed to update this item');
    }

    return this.dataSource.transaction(async manager => {
      item.isCompleted = isCompleted;
      await manager.save(item);

      const internChecklists = await manager.find(InternChecklist, { where: { checklist: { id: item.checklist.id } } as any });
      const icIds = internChecklists.map(ic => ic.id);
      if (icIds.length) {
        await manager
          .createQueryBuilder()
          .update(InternChecklistItem)
          .set({ isCompleted, completedAt: isCompleted ? new Date() : null })
          .where('intern_checklist_id IN (:...icIds)', { icIds })
          .andWhere('title = :title', { title: item.title })
          .execute();
      }

      const remaining = await manager.count(ChecklistItem, { where: { checklistId: item.checklist.id, isCompleted: false } } as any);
      const checklist = await manager.findOne(Checklist, { where: { id: item.checklist.id } as any });
      if (checklist) {
        checklist.isCompleted = remaining === 0;
        await manager.save(checklist);
      }

      for (const ic of internChecklists) {
        const rem = await manager.count(InternChecklistItem, { where: { internChecklistId: ic.id, isCompleted: false } as any });
        ic.isComplete = rem === 0;
        await manager.save(ic);
      }
    });
  }

  /** ---------------- Misc ---------------- */
  async findAllChecklists() {
    return this.checklistRepo.find({ relations: ['template', 'items', 'internChecklists'] });
  }

  async findChecklistById(id: string) {
    const checklist = await this.checklistRepo.findOne({ where: { id }, relations: ['template', 'items', 'internChecklists'] });
    if (!checklist) throw new NotFoundException('Checklist not found');
    return checklist;
  }

  async removeChecklistFromIntern(internId: string, checklistId: string) {
    return this.dataSource.transaction(async manager => {
      const internChecklist = await manager.findOne(InternChecklist, {
        where: { intern: { id: internId }, checklist: { id: checklistId } } as any,
        relations: ['items'],
      });
      if (!internChecklist) throw new NotFoundException('Intern checklist not found');

      await manager.delete(InternChecklistItem, { internChecklist: { id: internChecklist.id } } as any);
      await manager.delete(InternChecklist, { id: internChecklist.id } as any);

      const checklist = await manager.findOne(Checklist, { where: { id: checklistId } as any });
      if (checklist) {
        const remainingInterns = await manager.count(InternChecklist, { where: { checklist: { id: checklistId } } as any });
        if (remainingInterns === 0) {
          await manager.delete(ChecklistItem, { checklist: { id: checklistId } } as any);
          await manager.delete(Checklist, { id: checklistId } as any);
        }
      }
    });
  }
}
