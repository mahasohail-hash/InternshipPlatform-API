// src/mock/mock.module.ts
import { Module } from '@nestjs/common';
import { MockGithubIntegrationService, MockNlpService, MockLlmService } from './mock-external-services.service';

@Module({
  providers: [
    MockGithubIntegrationService,
    MockNlpService,
    MockLlmService,
  ],
  exports: [ // Export so other modules can import MockModule and inject these mocks
    MockGithubIntegrationService,
    MockNlpService,
    MockLlmService,
  ],
})
export class MockModule {}