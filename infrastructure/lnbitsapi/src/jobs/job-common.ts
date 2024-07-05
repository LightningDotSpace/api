import { CronJob } from 'cron';
import { CronExpression } from './enums/cron-expression.enum';
import { JobApiPaymentService } from './services/job-apipayment.service';
import { JobBoltcardService } from './services/job-boltcard.service';

export class JobCommon extends CronJob {
  private isRunning = false;

  private apiPaymentService: JobApiPaymentService;
  private boltcardService: JobBoltcardService;

  constructor() {
    super(CronExpression.EVERY_5_SECONDS, async () => this.process());

    this.apiPaymentService = new JobApiPaymentService();
    this.boltcardService = new JobBoltcardService();
  }

  async process(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    await this.apiPaymentService.checkApiPaymentChange();
    await this.boltcardService.checkBoltcardChange();

    this.isRunning = false;
  }
}
