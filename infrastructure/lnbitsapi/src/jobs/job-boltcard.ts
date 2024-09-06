import { CronJob } from 'cron';
import { CronExpression } from './enums/cron-expression.enum';
import { JobBoltcardService } from './services/job-boltcard.service';

export class JobBoltcard extends CronJob {
  private isRunning = false;

  private boltcardService: JobBoltcardService;

  constructor() {
    super(CronExpression.EVERY_5_SECONDS, async () => this.process());

    this.boltcardService = new JobBoltcardService();
  }

  async process(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    await this.boltcardService.checkBoltcardChange();
    this.isRunning = false;
  }
}
