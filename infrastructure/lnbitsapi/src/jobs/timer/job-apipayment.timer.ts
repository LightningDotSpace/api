import { WaitingTimer } from '../../timer/waiting-timer';

export class JobApiPaymentWaitingTimer extends WaitingTimer {
  // Waiting Interval: 15 seconds multiplied by increasing waiting counter
  readonly waitingInterval = 15 * 1000;

  constructor() {
    super();
  }
}
