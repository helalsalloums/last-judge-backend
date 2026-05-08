import { Module } from '@nestjs/common';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';
import { QueueModule } from 'src/queue/queue.module';
import { SubmissionProcessor } from './submission.processor';
import { SubmissionGateway } from './submission.gateway';
import { JudgeModule } from 'src/judge/judge.module';

@Module({
  controllers: [SubmissionController],
  providers: [SubmissionService, SubmissionProcessor, SubmissionGateway],
  imports: [QueueModule, JudgeModule]
})
export class SubmissionModule { }
