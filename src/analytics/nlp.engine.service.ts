import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NlpSummary } from './entities/nlp-summary.entity';

// Use require to avoid ESM/CJS mismatch in some environments
const winkNLP = require('wink-nlp');
const winkModel = require('wink-eng-lite-web-model');

const nlp = winkNLP(winkModel);
const its = nlp.its;

@Injectable()
export class NlpEngineService {
  constructor(
    @InjectRepository(NlpSummary)
    private readonly nlpSummaryRepo: Repository<NlpSummary>,
  ) {}

  /**
   * Process a list of feedback items for an intern and persist summary.
   * Accepts internId (numeric id of user) and list [{ text, date }]
   */
  async processInternFeedback(internId: number, feedbackList: { text: string; date: Date }[]) {
    const emptySummary = {
      overallSentiment: 'Neutral',
      sentimentSummary: 'No feedback available.',
      sentimentTimeline: [] as { date: string | Date; score: string }[],
      keywords: [] as string[],
      topics: [] as { topic: string; frequency: number }[],
      emotions: {} as Record<string, number>,
    };

    if (!feedbackList || feedbackList.length === 0) {
      // Try to find existing summary row for this intern
      const existing = await this.nlpSummaryRepo.findOne({
        where: { intern: { id: internId } as any },
      } as any);

      if (existing) {
        existing.summaryJson = emptySummary;
        existing.analysisDate = new Date();
        return this.nlpSummaryRepo.save(existing as any);
      }

      const created = this.nlpSummaryRepo.create({
        intern: { id: internId } as any,
        evaluation: null,
        summaryJson: emptySummary,
        analysisDate: new Date(),
      } as Partial<NlpSummary>);

      return this.nlpSummaryRepo.save(created as any);
    }

    // Run pipeline
    const analysis = this.runNlpPipeline(feedbackList);

    const summaryJson: any = {
      overallSentiment: analysis.overallSentiment,
      sentimentSummary: analysis.sentimentSummary,
      sentimentTimeline: analysis.sentimentTimeline,
      keywords: analysis.keywords,
      topics: analysis.topics,
      emotions: analysis.emotions,
    };

    // Persist (upsert-like)
    let summary = await this.nlpSummaryRepo.findOne({
      where: { intern: { id: internId } as any },
    } as any);

    if (!summary) {
      summary = this.nlpSummaryRepo.create({
        intern: { id: internId } as any,
        evaluation: null,
        summaryJson,
        analysisDate: new Date(),
      } as Partial<NlpSummary>);
    } else {
      summary.summaryJson = summaryJson;
      summary.analysisDate = new Date();
    }

    return this.nlpSummaryRepo.save(summary as any);
  }

  // Compose full text / timeline / keywords / topics / emotions
  runNlpPipeline(list: { text: string; date: Date }[]) {
    const fullText = list.map((f) => f.text).join('. ');

    const sentimentTimeline = list.map((f) => {
      const { label } = this.getSentiment(f.text);
      return { date: f.date, score: label };
    });

    const keywords = this.getKeywords(fullText);
    const topics = this.getTopics(fullText);
    const emotions = this.getEmotions(fullText);

    const numericScores: number[] = sentimentTimeline.map((t) =>
      t.score === 'positive' ? 1 : t.score === 'negative' ? -1 : 0,
    );

    const avg = numericScores.length > 0 ? numericScores.reduce((a, b) => a + b, 0) / numericScores.length : 0;
    const overall = avg > 0.25 ? 'Positive' : avg < -0.25 ? 'Negative' : 'Neutral';
    const sentimentSummary = this.buildSummary(overall, keywords, topics);

    return {
      overallSentiment: overall,
      sentimentSummary,
      sentimentTimeline,
      keywords,
      topics,
      emotions,
    };
  }

  getSentiment(text: string) {
    const doc = nlp.readDoc(text || '');
    const val = Number(doc.out(its.sentiment));
    const label = val > 0.3 ? 'positive' : val < -0.3 ? 'negative' : 'neutral';
    return { score: val, label };
  }

  getKeywords(text: string) {
    const doc = nlp.readDoc(text || '');
    const words = doc.tokens().filter((t: any) => t.out(its.type) === 'word').out(its.normal);

    const stop = new Set(['the', 'and', 'is', 'to', 'in', 'for', 'with', 'of', 'a']);
    const freq: Record<string, number> = {};
    (words || []).forEach((w: string) => {
      if (!w) return;
      const lw = w.toLowerCase();
      if (lw.length > 2 && !stop.has(lw)) freq[lw] = (freq[lw] || 0) + 1;
    });

    return Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 12);
  }

  getTopics(text: string) {
    const doc = nlp.readDoc(text || '');
    const nouns = doc.tokens().filter((t: any) => {
      const pos = t.out(its.pos) || '';
      return ['NN', 'NNS', 'NNP', 'NNPS'].includes(pos);
    }).out(its.normal);

    const freq: Record<string, number> = {};
    (nouns || []).forEach((n: string) => {
      if (!n) return;
      const ln = n.toLowerCase();
      freq[ln] = (freq[ln] || 0) + 1;
    });

    return Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 10).map((t) => ({ topic: t, frequency: freq[t] }));
  }

  getEmotions(text: string) {
    const lower = (text || '').toLowerCase();
    const lex: Record<string, string[]> = {
      joy: ['happy', 'great', 'excellent', 'love', 'amazing', 'good'],
      anger: ['angry', 'mad', 'annoy', 'irritate', 'hate'],
      sadness: ['sad', 'upset', 'disappoint', 'disappointed'],
      fear: ['fear', 'worried', 'scared', 'nervous'],
      surprise: ['wow', 'unexpected', 'shock'],
    };

    const scores: Record<string, number> = {};
    let total = 0;
    for (const [emotion, words] of Object.entries(lex)) {
      let count = 0;
      words.forEach((w) => {
        count += (lower.match(new RegExp(w, 'g')) || []).length;
      });
      scores[emotion] = count;
      total += count;
    }

    if (total === 0) {
      Object.keys(scores).forEach((k) => (scores[k] = 0));
      return scores;
    }

    Object.keys(scores).forEach((k) => {
      scores[k] = +(scores[k] / total).toFixed(3);
    });

    return scores;
  }

  buildSummary(sentiment: string, keywords: string[], topics: any[]) {
    let s = `Overall sentiment: ${sentiment}. `;
    if (keywords && keywords.length) s += `Key themes: ${keywords.slice(0, 5).join(', ')}. `;
    if (topics && topics.length) s += `Main topics: ${topics.slice(0, 3).map((t) => t.topic).join(', ')}.`;
    return s;
  }
}
