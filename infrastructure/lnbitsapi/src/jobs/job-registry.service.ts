import { CronJob } from 'cron';
import { randomUUID } from 'crypto';
import { LnbitsApiLogger } from '../shared/lnbitsapi-logger';
import { JobApiPayment } from './job-apipayment';
import { JobBoltcard } from './job-boltcard';

class JobRegistryService {
  private readonly logger = new LnbitsApiLogger(JobRegistryService);

  private jobRegistry: Map<string, CronJob>;

  constructor() {
    this.jobRegistry = new Map();
    this.logger.verbose('JobRegistry initialized');
  }

  setup() {
    this.register(new JobApiPayment());
    this.register(new JobBoltcard());
  }

  register(job: CronJob): string {
    const uniqueJobId = randomUUID();

    this.jobRegistry.set(uniqueJobId, job);
    this.logger.verbose(`${job.constructor.name} registered: ${uniqueJobId}`);

    return uniqueJobId;
  }

  unregister(uniqueJobId: string): void {
    this.jobRegistry.delete(uniqueJobId);
    this.logger.verbose(`Job unregistered: ${uniqueJobId}`);
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
