import { RskSwapStatus } from '../services/rsk-swap-client.service';

export class RskSwapStatusDto {
  id: string;
  status: RskSwapStatus;
  invoice?: string;
  invoicePaid: boolean;
  lockupTxId?: string;
  lockupAddress?: string;
  lockupAmount?: number;
  claimTxId?: string;
  timeoutBlockHeight: number;
}
