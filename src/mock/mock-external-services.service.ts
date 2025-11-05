// src/mock/mock-external-services.service.ts
import { Injectable } from '@nestjs/common';

// --- Mock service for GitHub ---
@Injectable()
export class MockGithubIntegrationService {
  async getContributionMetrics(internId: string): Promise<{ commits: number; linesChanged: number; pullRequests: number }> {
    console.log(`[Mock Github] Getting metrics for intern ID (string): ${internId}`);
    await new Promise(resolve => setTimeout(resolve, 50));
    return { 
        commits: Math.floor(Math.random() * 40) + 10, 
        linesChanged: Math.floor(Math.random() * 500) + 100, 
        pullRequests: Math.floor(Math.random() * 5) + 1 
    };
  }
}

// --- Mock service for NLP ---
@Injectable()
export class MockNlpService {
  async summarizeFeedback(feedbackTexts: string[]): Promise<{ sentiment: string; themes: string[] }> {
    console.log(`[Mock NLP] Analyzing ${feedbackTexts.length} feedback notes...`);
    await new Promise(resolve => setTimeout(resolve, 50));
    if (feedbackTexts.length === 0) return { sentiment: 'neutral', themes: ['no feedback'] };
    const sentiment = Math.random() > 0.6 ? 'positive' : Math.random() < 0.4 ? 'negative' : 'neutral';
    const themes = ['mock theme 1', 'mock theme 2'];
    return { sentiment, themes };
   }
}

// --- Mock service for LLM (AI Drafting) ---
@Injectable()
export class MockLlmService {
  async generateReview(prompt: string): Promise<string> {
    console.log('[Mock LLM] Generating review...');
    await new Promise(resolve => setTimeout(resolve, 100));
    return `AI MOCK DRAFT for: ${prompt.split('Draft review for: ')[1]?.split('\n')[0] || 'Intern'}.`;
  }
}