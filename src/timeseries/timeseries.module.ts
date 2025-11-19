import { Module } from '@nestjs/common';
import { TimeseriesController } from '../timeseries/timeseries.controller';
import { TimeseriesService } from '../timeseries/timeseries.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommitEntity } from '../entities/commit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CommitEntity])],
  controllers: [TimeseriesController],
  providers: [TimeseriesService],
    exports: [TimeseriesService],
})
export class TimeseriesModule {}
