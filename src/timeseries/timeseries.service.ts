import { Injectable } from '@nestjs/common';

@Injectable()
export class TimeseriesService {
  async getTimeseries(internId: number) {
    return [
      { date: '2025-01-01', commits: 2 },
      { date: '2025-01-02', commits: 4 },
    ];
  }
}
