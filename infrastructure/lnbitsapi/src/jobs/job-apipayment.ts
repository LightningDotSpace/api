import { CronJob } from 'cron';
import { CronExpression } from './enums/cron-expression.enum';
import { JobApiPaymentService } from './services/job-apipayment.service';

export class JobApiPayment extends CronJob {
  private isRunning = false;

  private apiPaymentService: JobApiPaymentService;

  constructor() {
    super(CronExpression.EVERY_5_SECONDS, async () => this.process());

    this.apiPaymentService = new JobApiPaymentService();
  }

  async process(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    await this.apiPaymentService.checkApiPaymentChange();
    this.isRunning = false;
  }
}
