import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Config } from 'src/config/config';
import { firstValueFrom } from 'rxjs';

export interface CreateRskSwapRequest {
  invoiceAmount: number;
  claimAddress: string;
}

export interface CreateRskSwapResponse {
  id: string;
  invoice: string;
  preimageHash: string;
  claimPublicKey: string;
  timeoutBlockHeight: number;
  claimPrivateKey: string;
  preimage: string;
}

export enum RskSwapStatus {
  PENDING = 'pending',
  INVOICE_PAID = 'invoice_paid',
  LOCKED = 'locked',
  CLAIMED = 'claimed',
  REFUNDED = 'refunded',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

export interface RskSwapStatusResponse {
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

@Injectable()
export class RskSwapClientService {
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = Config.rsk.microserviceUrl || 'http://localhost:3002';
  }

  /**
   * Create a new reverse swap (Lightning ’ RBTC)
   */
  async createReverseSwap(request: CreateRskSwapRequest): Promise<CreateRskSwapResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<CreateRskSwapResponse>(`${this.baseUrl}/api/swaps/reverse`, request),
      );

      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to create RSK reverse swap: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get swap status by ID
   */
  async getSwapStatus(swapId: string): Promise<RskSwapStatusResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<RskSwapStatusResponse>(`${this.baseUrl}/api/swaps/${swapId}`),
      );

      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get RSK swap status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Check microservice health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await firstValueFrom(this.httpService.get(`${this.baseUrl}/health`));

      return response.status === 200 && response.data?.status === 'ok';
    } catch (error) {
      return false;
    }
  }
}
