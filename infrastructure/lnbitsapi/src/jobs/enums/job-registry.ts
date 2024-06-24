import { CronJob } from 'cron';
import { randomUUID } from 'crypto';
import { LnbitsApiLogger } from '../../shared/lnbitsapi-logger';
import { JobApiPayment } from '../job-apipayment';

class JobRegistryService {
  private readonly logger = new LnbitsApiLogger(JobRegistryService);

  private jobRegistry: Map<string, CronJob>;

  constructor() {
    this.jobRegistry = new Map();
    this.logger.verbose('JobRegistry initialized');
  }

  setup() {
    const jobApiPayment = new JobApiPayment();
    const uniqueJobId = this.register(jobApiPayment);
    this.logger.verbose(`JobApiPayment registered with id ${uniqueJobId}`);
  }

  register(job: CronJob): string {
    const uniqueJobId = randomUUID();

    this.jobRegistry.set(uniqueJobId, job);

    return uniqueJobId;
  }

  unregister(uniqueJobId: string): void {
    this.jobRegistry.delete(uniqueJobId);
  }

  startJobs(): void {
    this.jobRegistry.forEach((j) => j.start());
    this.logger.verbose('Jobs started');
  }

  stopJobs(): void {
    this.jobRegistry.forEach((j) => j.stop());
    this.logger.verbose('Jobs stopped');
  }
}

export const JobRegistry: JobRegistryService = new JobRegistryService();
