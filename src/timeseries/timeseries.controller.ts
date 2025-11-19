import { Controller, Get, Param } from '@nestjs/common';
import { TimeseriesService } from '../timeseries/timeseries.service';

@Controller('analytics')
export class TimeseriesController {
  constructor(private timeseriesService: TimeseriesService) {}

  @Get('github-timeseries/:internId')
  getTimeseries(@Param('internId') id: string) {
    return this.timeseriesService.getTimeseries(+id);
  }
}
