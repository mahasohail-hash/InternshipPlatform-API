
import { IsUUID, IsNotEmpty } from 'class-validator';

export class AssignChecklistDto {
    @IsUUID('4', { message: 'Must provide a valid Intern ID (UUID).' })
    @IsNotEmpty()
    internId!: string;

    @IsUUID('4', { message: 'Must provide a valid Template ID (UUID).' })
    @IsNotEmpty()
    templateId!: string;
}