import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async createSummary(internId: string) {
    const prompt = `Generate AI summary for intern ${internId}`;

    const result = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    return { summary: result.choices[0].message.content };
  }
}
