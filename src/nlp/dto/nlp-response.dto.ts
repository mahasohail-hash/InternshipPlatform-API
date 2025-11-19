export class NlpResponseDto {
  sentimentTimeline!: { date: string; score: number; }[];
  keywords!: string[];
  topics!: { topic: string; frequency: number; }[];
}
