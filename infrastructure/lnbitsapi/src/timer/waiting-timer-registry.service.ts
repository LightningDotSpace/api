import { randomUUID } from 'crypto';
import { LnbitsApiLogger } from '../shared/lnbitsapi-logger';
import { WaitingTimer } from './waiting-timer';

class WaitingTimerRegistryService {
  private readonly logger = new LnbitsApiLogger(WaitingTimerRegistryService);

  private waitingTimerRegistry: Map<string, WaitingTimer>;

  constructor() {
    this.waitingTimerRegistry = new Map();
    this.logger.verbose('WaitingTimerRegistry initialized');
  }

  register(timer: WaitingTimer): string {
    const uniqueTimeoutId = randomUUID();

    this.waitingTimerRegistry.set(uniqueTimeoutId, timer);
    this.logger.verbose(`${timer.constructor.name} registered: ${uniqueTimeoutId}`);

    return uniqueTimeoutId;
  }

  unregister(uniqueTimeoutId: string): void {
    this.waitingTimerRegistry.delete(uniqueTimeoutId);
    this.logger.verbose(`WaitingTimer unregistered: ${uniqueTimeoutId}`);
  }

  startTimers(): void {
    this.waitingTimerRegistry.forEach((t) => t.start());
    this.logger.verbose('WaitingTimers started');
  }

  stopTimers(): void {
    this.waitingTimerRegistry.forEach((t) => t.stop());
    this.logger.verbose('WaitingTimers stopped');
  }
}

export const WaitingTimerRegistry: WaitingTimerRegistryService = new WaitingTimerRegistryService();
