import { Module } from '@nestjs/common';
import { TimeseriesController } from '../timeseries/timeseries.controller';
import { TimeseriesService } from '../timeseries/timeseries.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commit } from '@/commit/entities/commit.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Commit])],
  controllers: [TimeseriesController],
  providers: [TimeseriesService],
    exports: [TimeseriesService],
})
export class TimeseriesModule {}
