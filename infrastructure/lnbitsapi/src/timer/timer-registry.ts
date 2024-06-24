import { randomUUID } from 'crypto';
import { LnbitsApiLogger } from '../shared/lnbitsapi-logger';

export interface Timer {
  start: () => void;
  stop: () => void;
  isRunning: () => void;
}

class TimerRegistryService {
  private readonly logger = new LnbitsApiLogger(TimerRegistryService);

  private timerRegistry: Map<string, Timer>;

  constructor() {
    this.timerRegistry = new Map();
    this.logger.verbose('TimerRegistry initialized');
  }

  register(timer: Timer): string {
    const uniqueTimeoutId = randomUUID();

    this.timerRegistry.set(uniqueTimeoutId, timer);

    return uniqueTimeoutId;
  }

  unregister(uniqueTimeoutId: string): void {
    this.timerRegistry.delete(uniqueTimeoutId);
  }

  startTimers(): void {
    this.timerRegistry.forEach((t) => t.start());
    this.logger.verbose('Timers started');
  }

  stopTimers(): void {
    this.timerRegistry.forEach((t) => t.stop());
    this.logger.verbose('Timers stopped');
  }
}

export const TimerRegistry: TimerRegistryService = new TimerRegistryService();
