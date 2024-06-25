import { CronJob } from 'cron';
import { LnbitsApiLogger } from '../shared/lnbitsapi-logger';
import { CronExpression } from './enums/cron-expression.enum';
import { JobApiPaymentService } from './services/job-apipayment.service';

export class JobApiPayment extends CronJob {
  private readonly logger = new LnbitsApiLogger(JobApiPayment);

  private service: JobApiPaymentService;

  constructor() {
    super(CronExpression.EVERY_5_SECONDS, async () => this.process());

    this.service = new JobApiPaymentService();
  }

  async process(): Promise<void> {
    return this.service.checkApiPaymentChange();
  }
}
