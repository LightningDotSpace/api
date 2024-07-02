import { LnbitsApiLogger } from '../shared/lnbitsapi-logger';
import { WaitingTimerRegistry } from './waiting-timer-registry.service';

export abstract class WaitingTimer {
  private readonly logger = new LnbitsApiLogger(WaitingTimer);

  private timeoutHandler: NodeJS.Timeout | null = null;

  private waitingCounter = 0;
  private waitingTime = 0;

  constructor() {
    WaitingTimerRegistry.register(this);
  }

  abstract waitingInterval: number;

  start() {
    if (this.timeoutHandler === null) {
      this.logger.verbose('start()');

      this.waitingCounter++;
      this.waitingTime = this.waitingCounter * this.waitingInterval;

      this.logger.verbose(`waitingCounter = ${this.waitingCounter} / waitingTime = ${this.waitingTime}`);

      this.timeoutHandler = setTimeout(() => {
        this.resetWaitingTime();
        this.timeoutHandler = null;
      }, this.waitingTime);
    }
  }

  stop() {
    this.logger.verbose('stop()');

    if (this.timeoutHandler) {
      clearTimeout(this.timeoutHandler);
      this.timeoutHandler = null;
    }

    this.resetWaitingCounter();
    this.resetWaitingTime();
  }

  isRunning() {
    return this.waitingTime != 0;
  }

  private resetWaitingCounter() {
    this.logger.verbose('resetWaitingCounter()');
    this.waitingCounter = 0;
  }

  private resetWaitingTime() {
    this.logger.verbose('resetWaitingTime()');
    this.waitingTime = 0;
  }
}
