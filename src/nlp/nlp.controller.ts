import { Controller, Get, Param } from '@nestjs/common';
import { NlpService } from './nlp.service';

@Controller('nlp')
export class NlpController {
  constructor(private readonly nlpService: NlpService) {}

  @Get(':id')
  async analyze(@Param('id') id: string) {
    const mockFeedback = [
      { text: 'Great performance and excellent teamwork.', date: new Date() },
      { text: 'Some delays but overall good progress.', date: new Date() },
      { text: 'The intern was nervous in the beginning.', date: new Date() },
    ];

    return this.nlpService.generateAndStoreNlpSummary(+id, mockFeedback);
  }
}
