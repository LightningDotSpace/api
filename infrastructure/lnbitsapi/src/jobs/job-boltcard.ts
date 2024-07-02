import { CronJob } from 'cron';
import { LnbitsApiLogger } from '../shared/lnbitsapi-logger';
import { CronExpression } from './enums/cron-expression.enum';
import { JobBoltcardService } from './services/job-boltcard.service';

export class JobBoltcard extends CronJob {
  private readonly logger = new LnbitsApiLogger(JobBoltcard);

  private service: JobBoltcardService;

  constructor() {
    super(CronExpression.EVERY_5_SECONDS, async () => this.process());

    this.service = new JobBoltcardService();
  }

  async process(): Promise<void> {
    return this.service.checkBoltcardChange();
  }
}
