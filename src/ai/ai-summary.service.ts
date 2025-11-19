import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';


@Injectable()
export class AiSummaryService {
private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY});


async generateSummary(internId: string) {
// Example: use OpenAI model
const res = await this.openai.chat.completions.create({
model: 'gpt-4o-mini',
messages: [
{
role: 'system',
content: 'Generate internship AI summary.',
},
{
role: 'user',
content: `Generate a performance summary for intern ${internId}.`,
},
],
});


return {
internId,
summary: res.choices[0].message.content,
};
}
}