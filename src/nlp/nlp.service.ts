import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/users.entity';
import { NlpSummary } from '../analytics/entities/nlp-summary.entity';

// Wink NLP
const winkNlp = require('wink-nlp');
const model = require('wink-eng-lite-web-model');
const nlp = winkNlp(model);
const its = nlp.its;

@Injectable()
export class NlpService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(NlpSummary) private readonly nlpRepo: Repository<NlpSummary>,
  ) {}

  // -------------------------------------
  // BASIC NLP ANALYSIS FUNCTION
  // -------------------------------------
  private analyzeText(text: string) {
    if (!text || !text.trim()) {
      return { sentimentScore: 'N/A', keyThemes: [] };
    }

    const doc = nlp.readDoc(text);
    const sentimentVal = doc.out(its.sentiment);
    const sentimentNum =
      typeof sentimentVal === 'number' ? sentimentVal : Number(sentimentVal);

    let sentimentScore = 'Neutral';
    if (!isNaN(sentimentNum)) {
      if (sentimentNum > 0.3) sentimentScore = 'Positive';
      else if (sentimentNum < -0.3) sentimentScore = 'Negative';
    }

    const importantWords: string[] = doc
      .tokens()
      .filter((t: any) =>
        ['noun', 'verb', 'adjective'].includes(t.out(its.type)),
      )
      .out(its.normal);

    const freq: Record<string, number> = {};
    importantWords.forEach((w) => {
      const lw = (w || '').toLowerCase();
      if (lw.length > 2) freq[lw] = (freq[lw] || 0) + 1;
    });

    const keyThemes = Object.keys(freq)
      .sort((a, b) => freq[b] - freq[a])
      .slice(0, 5);

    return { sentimentScore, keyThemes };
  }

  // -------------------------------------
  // THIS METHOD FIXES YOUR COMPILATION ERROR
  // -------------------------------------
  async generateAndStoreNlpSummary(
    internId: number,
    feedbackArray: { text: string; date: Date }[],
  ) {
const intern = await this.usersRepo.findOne({
  where: { id: String(internId) },
});
    if (!intern) throw new NotFoundException(`Intern ${internId} not found`);

    const combinedText = feedbackArray.map((f) => f.text).join('. ');

    const analysis = this.analyzeText(combinedText);

    const summaryPayload = {
      overallSentiment: analysis.sentimentScore.toLowerCase(),
      sentimentSummary: `Detected ${analysis.sentimentScore}`,
      keywords: analysis.keyThemes,
      topics: analysis.keyThemes.map((k) => ({ topic: k, frequency: 1 })),
      emotions: {},
      sentimentTimeline: [],
      // compatibility
      sentimentScore: analysis.sentimentScore,
      keyThemes: analysis.keyThemes,
    };

    // Check if a summary already exists for intern
    let summary = await this.nlpRepo.findOne({
      where: { intern: { id: internId } as any },
    });

    if (summary) {
      summary.summaryJson = summaryPayload;
      summary.analysisDate = new Date();
      return this.nlpRepo.save(summary);
    }

    // If not found → create new summary
    summary = this.nlpRepo.create({
      intern: intern as any,
      evaluation: null,
      summaryJson: summaryPayload,
      analysisDate: new Date(),
    });

    return this.nlpRepo.save(summary);
  }
}
