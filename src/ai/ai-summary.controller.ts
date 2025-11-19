import { Controller, Post, Param } from '@nestjs/common';
import { AiSummaryService } from '../ai/ai-summary.service';


@Controller('ai')
export class AiSummaryController {
constructor(private readonly aiService: AiSummaryService) {}


@Post('summary/:internId')
generateSummary(@Param('internId') internId: string) {
return this.aiService.generateSummary(internId);
}
}