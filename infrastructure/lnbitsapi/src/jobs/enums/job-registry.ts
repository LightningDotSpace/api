import { CronJob } from 'cron';
import { randomUUID } from 'crypto';
import { LnbitsApiLogger } from '../../shared/lnbitsapi-logger';
import { JobApiPayment } from '../job-apipayment';

class JobRegistryService {
  private readonly logger = new LnbitsApiLogger(JobRegistryService);

  private jobRegistry: Map<string, CronJob>;

  constructor() {
    this.jobRegistry = new Map();
    this.logger.info('JobRegistry initialized');
  }

  setup() {
    const jobApiPayment = new JobApiPayment();
    const uniqueJobId = this.register(jobApiPayment);
    this.logger.info(`JobApiPayment registered with id ${uniqueJobId}`);
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
    this.logger.info('Jobs started');
  }

  stopJobs(): void {
    this.jobRegistry.forEach((j) => j.stop());
    this.logger.info('Jobs stopped');
  }
}

export const JobRegistry: JobRegistryService = new JobRegistryService();
