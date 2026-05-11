import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { JudgeService } from "src/judge/judge.service";

@Processor('submission')
export class SubmissionProcessor extends WorkerHost {
  constructor(private readonly judgeService: JudgeService) {
    super()
  }

  async process(job: Job) {
    if (job.name === 'judge') {
      try {
        console.log('Job received', job.data);
        const result = await this.judgeService.judge(job.data.submissionId);
        console.log(result);
      } catch(err) {
        console.error('Judge failed:', err);
        throw err;
      }
    }
  }
}
