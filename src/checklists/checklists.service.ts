import { Injectable, NotFoundException, ConflictException ,InternalServerErrorException} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { ChecklistTemplate } from './entities/checklist-template.entity';
import { ChecklistTemplateItem } from './entities/checklist-template-item.entity';
import { Checklist } from './entities/checklist.entity'; // <-- ADD THIS
import { ChecklistItem } from './entities/checklist-item.entity';
import { InternChecklist } from './entities/intern-checklist.entity';
import { InternChecklistItem } from './entities/intern-checklist-item.entity';
// Correct DTO import paths
import { CreateChecklistTemplateDto } from './dto/create-checklist-template.dto';
import { UpdateChecklistTemplateDto } from './dto/update-checklist-template.dto';
import { User } from '../users/entities/users.entity';
@Injectable()
export class ChecklistsService {
  constructor(
    @InjectRepository(ChecklistTemplate)
    private templateRepository: Repository<ChecklistTemplate>,
  @InjectRepository(ChecklistTemplate) 
        private checklistTemplateRepository: Repository<ChecklistTemplate>,
   @InjectRepository(ChecklistTemplate) 
        private templateRepo: Repository<ChecklistTemplate>,
@InjectRepository(ChecklistTemplateItem) 
        private checklistTemplateItemRepository: Repository<ChecklistTemplateItem>,
    @InjectRepository(ChecklistTemplateItem)
    private itemRepository: Repository<ChecklistTemplateItem>,
    @InjectRepository(Checklist)
    private checklistRepository: Repository<Checklist>,
    @InjectRepository(ChecklistItem)
    private checklistItemRepository: Repository<ChecklistItem>,
    @InjectRepository(InternChecklist) 
        private internChecklistRepository: Repository<InternChecklist>,

        @InjectRepository(InternChecklistItem) 
        private internChecklistItemRepository: Repository<InternChecklistItem>,
    

  ) {}

async assignTemplatesToUser(user: User): Promise<void> {
    if (!user || user.role !== 'INTERN') {
        console.warn(`[ChecklistsService] Aborted assignment for non-intern: ${user.email}`);
        return;
    }
    const templates = await this.findAllTemplates();
    if (!templates || templates.length === 0) {
      console.log(`[ChecklistsService] No templates found for user ${user.id}`);
      return;
    }

    console.log(`[ChecklistsService] Starting assignment for intern ${user.id}...`);

    try {
        for (const template of templates) {
            // 1. Create the Checklist instance (link to user and template)
            const checklistInstance = this.checklistRepository.create({
                name: template.name,
                user: user,
                template: template,
            });
            const savedChecklist = await this.checklistRepository.save(checklistInstance);

            // 2. Create copies of items for the Checklist instance
            if (template.items && template.items.length > 0) {
                const itemsToCreate = template.items.map(templateItem =>
                    this.checklistItemRepository.create({
                        title: templateItem.title,
                        description: (templateItem as any).text || templateItem.title, // Fallback to title if 'text' isn't available
                        isComplete: false,
                        checklist: savedChecklist, // Link to saved instance
                    })
                );
                await this.checklistItemRepository.save(itemsToCreate);
            }
        }
        console.log(`[ChecklistsService] Finished assignment for intern ${user.id}`);
    } catch (error) {
        console.error(`[ChecklistsService] Database error during assignment for user ${user.id}:`, error);
        throw new InternalServerErrorException('Failed to complete checklist assignment due to a database error.');
    }
  }
  
  // 1. CREATE Logic
  async createTemplate(dto: CreateChecklistTemplateDto): Promise<ChecklistTemplate> {
    const { items, ...templateData } = dto;

    
    try {
      const template = this.templateRepository.create(templateData);
      const newTemplate = await this.templateRepository.save(template);

      if (items && items.length > 0) {
        const templateItems = items.map((itemDto) =>
          this.itemRepository.create({ ...itemDto, template: newTemplate }),
        );
        await this.itemRepository.save(templateItems);
        newTemplate.items = templateItems;
      }
      return newTemplate;
    } catch (error) {
      // This catches the "name already exists" error (PostgreSQL code)
      // FIX: Assert 'error' as 'any' to access the 'code' property
      if ((error as any).code === '23505') {
        throw new ConflictException(`A template with the name '${templateData.name}' already exists.`);
      }
      // Re-throw any other (unexpected) errors
      throw error;
    }
  }

//Fetch only one default template
async findDefaultTemplate(): Promise<ChecklistTemplate | null> {
    // This finds the single newest template
    return this.checklistTemplateRepository.findOne({
        relations: ['items'], // Must still load the items
        order: {id: 'DESC' }, // Assuming the newest is the default
    });
}

  // 2. READ All Logic
  async findAllTemplates(): Promise<ChecklistTemplate[]> {
     
   return this.checklistTemplateRepository.find({ 
            relations: ['items'],
            order: { name: 'ASC' },
        });
}
  // 3. UPDATE Logic
  async updateTemplate(id: string, dto: UpdateChecklistTemplateDto): Promise<ChecklistTemplate> {
    const { items, ...templateData } = dto;

    // 1. Fetch template to update
    let template = await this.templateRepository.findOne({ where: { id }, relations: ['items'] });
    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    // 2. Update the template's main properties (name, description)
    try {
      await this.templateRepository.save({ ...template, ...templateData });
    } catch (error) {
      // Handle unique constraint violation on update
      // FIX: Assert 'error' as 'any' to access the 'code' property
      if ((error as any).code === '23505') {
        throw new ConflictException(`A template with the name '${templateData.name}' already exists.`);
      }
      throw error;
    }

    if (items) { // `items` can be null, undefined, or an array []
      // 3. Get all item IDs from the DTO
      const incomingItemIds = items
        .map((item) => item.id)
        .filter((itemId) => itemId); // Filter out null/undefined IDs (for new items)

      // 4. Delete any items that are in the DB but *not* in the incoming DTO
      if (incomingItemIds.length > 0) {
        // Case 1: DTO has items. Delete any items *not* in the list.
        await this.itemRepository.delete({
          template: { id: template.id },
          id: Not(In(incomingItemIds as string[])),
        });
      } else {
        // Case 2: DTO has an empty 'items' array []. Delete *all* items for this template.
        await this.itemRepository.delete({ template: { id: template.id } });
      }

      // 5. Create/Update all items from the DTO
      const itemsToSave = items.map((itemDto) => {
        return this.itemRepository.create({
          ...itemDto, // This includes 'id' if it's an update
          template: template, // Ensure the relation is set
        });
      });
      // This will correctly update existing items (by ID) and create new ones
      await this.itemRepository.save(itemsToSave);
    }
    // Note: If 'items' is null/undefined, we skip updating/deleting items completely

    // 6. Return the fully updated template
    const finalTemplate = await this.templateRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!finalTemplate) {
      throw new NotFoundException(`Template ${id} not found after update`);
    }
    return finalTemplate;
  }

  // 4. DELETE Logic
  async deleteTemplate(id: string): Promise<void> {
    const result = await this.templateRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Template ${id} not found`);
  }

  // --- ADD THIS METHOD FOR THE INTERN PAGE ---
  async findChecklistByInternId(internId: string): Promise<Checklist> {
    const checklist = await this.checklistRepository.findOne({
      where: { user: { id: internId } },
      relations: {
        template: true,
        items: true,
      },
      order: {
        createdAt: 'ASC', // Get the first one created
      },
    });

    if (!checklist) {
      throw new NotFoundException(`No checklist found for intern ${internId}`);
    }

    
    if (checklist.items) {
      checklist.items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    return checklist;
  }
  // --- ADD THIS METHOD FOR TOGGLING CHECKBOXES ---
  async updateChecklistItemStatus(
    itemId: string,
    isCompleted: boolean,
  ): Promise<ChecklistItem> {
    const item = await this.checklistItemRepository.findOneBy({ id: itemId });
    if (!item) {
      throw new NotFoundException(`Checklist item ${itemId} not found`);
    }

    item.isComplete = isCompleted;
    item.completedAt = isCompleted ? new Date() : null;
    return this.checklistItemRepository.save(item);
  }
}
