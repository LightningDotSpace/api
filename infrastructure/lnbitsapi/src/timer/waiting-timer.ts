import { LnbitsApiLogger } from '../shared/lnbitsapi-logger';
import { Timer, TimerRegistry } from './timer-registry';

export class WaitingTimer implements Timer {
  private readonly logger = new LnbitsApiLogger(WaitingTimer);

  private timeoutHandler: NodeJS.Timeout | null = null;

  private waitingCounter = 0;
  private waitingTime = 0;

  constructor() {
    TimerRegistry.register(this);
  }

  start() {
    if (this.timeoutHandler === null) {
      this.logger.info('start()');

      this.waitingCounter++;
      this.waitingTime = this.waitingCounter * 60 * 1000;

      this.logger.info(`waitingCounter = ${this.waitingCounter} / waitingTime = ${this.waitingTime}`);

      this.timeoutHandler = setTimeout(() => {
        this.resetWaitingTime();
        this.timeoutHandler = null;
      }, this.waitingTime);
    }
  }

  stop() {
    this.logger.info('stop()');

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
    this.logger.info('resetWaitingCounter()');
    this.waitingCounter = 0;
  }

  private resetWaitingTime() {
    this.logger.info('resetWaitingTime()');
    this.waitingTime = 0;
  }
}