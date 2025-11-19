import { Injectable, NotFoundException, ForbiddenException, ConflictException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, EntityManager, DataSource, FindManyOptions } from 'typeorm'; // CRITICAL FIX: Import FindManyOptions
import { ChecklistTemplate } from './entities/checklist-template.entity';
import { ChecklistTemplateItem } from './entities/checklist-template-item.entity';
import { Checklist } from './entities/checklist.entity'; // Keep Checklist for other contexts if needed
import { ChecklistItem } from './entities/checklist-item.entity'; // Keep ChecklistItem for other contexts if needed
import { InternChecklist } from './entities/intern-checklist.entity';
import { InternChecklistItem } from './entities/intern-checklist-item.entity';
import { CreateChecklistTemplateDto } from './dto/create-checklist-template.dto';
import { UpdateChecklistTemplateDto } from './dto/update-checklist-template.dto';
import { User } from '../users/entities/users.entity';

@Injectable()
export class ChecklistsService {
  updateChecklistItemStatus(itemId: string, isCompleted: boolean) {
    throw new Error('Method not implemented.');
  }
  constructor(
    @InjectRepository(ChecklistTemplate)
    private templateRepository: Repository<ChecklistTemplate>,
    @InjectRepository(ChecklistTemplateItem)
    private itemRepository: Repository<ChecklistTemplateItem>,
    @InjectRepository(Checklist) // Keep if Checklist is intended for something else
    private checklistRepository: Repository<Checklist>,
    @InjectRepository(ChecklistItem) // Keep if ChecklistItem is intended for something else
    private checklistItemRepository: Repository<ChecklistItem>,
    @InjectRepository(InternChecklist)
    private internChecklistRepository: Repository<InternChecklist>,
    @InjectRepository(InternChecklistItem)
    private internChecklistItemRepository: Repository<InternChecklistItem>,
    private readonly entityManager: EntityManager,
    private readonly dataSource: DataSource,
  ) {}

  async createTemplate(dto: CreateChecklistTemplateDto): Promise<ChecklistTemplate> {
    const { items, ...templateData } = dto;
    try {
      const template = this.templateRepository.create(templateData);
      const newTemplate = await this.templateRepository.save(template);

      if (items && items.length > 0) {
        const templateItems = items.map((itemDto) =>
          this.itemRepository.create({
            title: itemDto.title,
            description: itemDto.text,
            template: newTemplate
          }),
        );
        await this.itemRepository.save(templateItems);
        newTemplate.items = templateItems;
      }
      return newTemplate;
    } catch (error) {
      if ((error as any).code === '23505') {
        throw new ConflictException(`A template with the name '${templateData.name}' already exists.`);
      }
      throw error;
    }
  }

  async findDefaultTemplate(): Promise<ChecklistTemplate | null> {
    return this.templateRepository.findOne({
      where: { name: 'Default Intern Onboarding Checklist' },
      relations: ['items'],
    });
  }

  async findAllTemplates(): Promise<ChecklistTemplate[]> {
    return this.templateRepository.find({
      relations: ['items'],
      order: { name: 'ASC' },
    });
  }

  async updateTemplate(id: string, dto: UpdateChecklistTemplateDto): Promise<ChecklistTemplate> {
    const { items, ...templateData } = dto;

    let template = await this.templateRepository.findOne({ where: { id }, relations: ['items'] });
    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    try {
      await this.templateRepository.save({ ...template, ...templateData });
    } catch (error) {
      if ((error as any).code === '23505') {
        throw new ConflictException(`A template with the name '${templateData.name}' already exists.`);
      }
      throw error;
    }

    if (items !== undefined) { // Check if items array is explicitly provided or undefined
      const incomingItemIds = items.map((item) => item.id).filter((itemId): itemId is string => !!itemId); // Filter and type-guard

      if (incomingItemIds.length > 0) {
        await this.itemRepository.delete({
          template: { id: template.id },
          id: Not(In(incomingItemIds)),
        });
      } else if (items.length === 0) { // If an empty array is sent, delete all
        await this.itemRepository.delete({ template: { id: template.id } });
      }

      const itemsToSave = items.map((itemDto) => {
        return this.itemRepository.create({
          id: itemDto.id,
          title: itemDto.title,
          description: itemDto.text,
          template: template,
        });
      });
      await this.itemRepository.save(itemsToSave);
      template.items = itemsToSave; // Update the relation for the returned object
    }
    // If items is undefined, no changes to nested items are made.

    const finalTemplate = await this.templateRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!finalTemplate) {
      throw new InternalServerErrorException(`Template ${id} not found after update, potential data inconsistency.`);
    }
    return finalTemplate;
  }

  async deleteTemplate(id: string): Promise<void> {
    const result = await this.templateRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Template ${id} not found`);
  }

  // CRITICAL FIX: Get an Intern's specific checklist using InternChecklistRepository
  async findChecklistByInternId(internId: string): Promise<InternChecklist> {
    const checklist = await this.internChecklistRepository.findOne({
      // CRITICAL FIX: Correct `where` clause for relation
      where: { intern: { id: internId } },
      relations: {
        template: true,
        items: true,
      },
      order: { createdAt: 'ASC' },
    });

    if (!checklist) {
      throw new NotFoundException(`No checklist found for intern ${internId}`);
    }

    if (checklist.items) {
        checklist.items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
    return checklist;
  }

  async updateItemStatus(itemId: string, isCompleted: boolean, internId: string): Promise<InternChecklistItem> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const item = await queryRunner.manager.findOne(InternChecklistItem, {
            where: { id: itemId },
            relations: ['internChecklist', 'internChecklist.intern'],
        });

        if (!item) {
            throw new NotFoundException('Checklist item not found.');
        }

        const assignedInternId = item.internChecklist?.intern?.id;
        if (!assignedInternId || assignedInternId !== internId) {
            throw new ForbiddenException('Access Denied: You cannot update this checklist item.');
        }

        item.isCompleted = isCompleted;
        item.completedAt = isCompleted ? new Date() : null;

        const updatedItem = await queryRunner.manager.save(InternChecklistItem, item);

        const parentChecklist = await queryRunner.manager.findOne(InternChecklist, {
            where: { id: item.internChecklist.id },
            relations: ['items'],
        });

        if (parentChecklist && parentChecklist.items) {
            const allItemsCompleted = parentChecklist.items.every(i => i.isCompleted);
            if (parentChecklist.isComplete !== allItemsCompleted) {
                parentChecklist.isComplete = allItemsCompleted;
                await queryRunner.manager.save(InternChecklist, parentChecklist);
            }
        }

        await queryRunner.commitTransaction();
        return updatedItem;

    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error("Checklist Item Status Update Failed:", error);
        if (error instanceof NotFoundException || error instanceof ForbiddenException) {
            throw error;
        }
        throw new InternalServerErrorException('Failed to update checklist item status due to a transaction error.');
    } finally {
        await queryRunner.release();
    }
  }

  async assignChecklist(intern: User, template: ChecklistTemplate): Promise<InternChecklist> {
    if (!intern || !template) {
        throw new BadRequestException('Intern and ChecklistTemplate are required for assignment.');
    }

    return await this.entityManager.transaction(async transactionalEntityManager => {
        const newChecklist = transactionalEntityManager.create(InternChecklist, {
            intern: intern,
            template: template,
        });
        const savedChecklist = await transactionalEntityManager.save(newChecklist);

        const templateItems = template.items || [];
        const itemsToCreate = templateItems.map((templateItem) =>
            transactionalEntityManager.create(InternChecklistItem, {
                title: templateItem.title,
                description: templateItem.description || undefined,
                isCompleted: false,
                internChecklist: savedChecklist,
            })
        );
        await transactionalEntityManager.save(itemsToCreate);

        console.log(`[ChecklistsService] Assigned checklist ${savedChecklist.id} to intern ${intern.id}.`);
        return savedChecklist;
    });
  }
}