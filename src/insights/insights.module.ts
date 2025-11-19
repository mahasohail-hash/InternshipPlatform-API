import { Module, forwardRef } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { GithubModule } from '../github/github.module'; // Import GithubModule

@Module({
  imports: [
    forwardRef(() => GithubModule), // Use forwardRef for GithubModule to resolve potential circular dependencies
  ],
  controllers: [InsightsController],
  providers: [InsightsService],
  exports: [InsightsService], // Export so other modules (e.g., dashboard) can inject it
})
export class InsightsModule {}