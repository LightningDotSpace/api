import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';

export interface BoltzSwapInfoResponse {
  version: string;
  pairs: {
    [key: string]: {
      rate: number;
      limits: {
        minimal: number;
        maximal: number;
        maximalZeroConf: {
          baseAsset: number;
          quoteAsset: number;
        };
      };
      fees: {
        percentage: number;
        percentageSwapIn: number;
        minerFees: {
          baseAsset: {
            normal: number;
            reverse: {
              claim: number;
              lockup: number;
            };
          };
          quoteAsset: {
            normal: number;
            reverse: {
              claim: number;
              lockup: number;
            };
          };
        };
      };
      hash: string;
    };
  };
}

export interface CreateSubmarineSwapRequest {
  type: 'submarine';
  pairId: string;
  orderSide: 'buy' | 'sell';
  invoice: string;
  refundPublicKey: string;
  channel?: {
    auto: boolean;
    private: boolean;
    inboundLiquidity: number;
  };
}

export interface CreateSubmarineSwapResponse {
  id: string;
  bip21: string;
  address: string;
  redeemScript: string;
  acceptZeroConf: boolean;
  expectedAmount: number;
  timeoutBlockHeight: number;
  claimDetails?: {
    transactionId: string;
    transactionHex: string;
  };
}

export interface CreateReverseSwapRequest {
  type: 'reversesubmarine';
  pairId: string;
  orderSide: 'buy' | 'sell';
  invoiceAmount: number;
  preimageHash: string;
  claimPublicKey: string;
  address?: string;
  addressSignature?: string;
}

export interface CreateReverseSwapResponse {
  id: string;
  invoice: string;
  redeemScript: string;
  lockupAddress: string;
  onchainAmount: number;
  timeoutBlockHeight: number;
  minerFeeInvoice?: string;
}

export interface SwapStatusResponse {
  status: string;
  transaction?: {
    id: string;
    hex: string;
    eta?: number;
  };
  failureReason?: string;
}

@Injectable()
export class BoltzApiClientService {
  private readonly logger = new Logger(BoltzApiClientService.name);
  private readonly boltzApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.boltzApiUrl = this.configService.get<string>(
      'BOLTZ_API_URL',
      'http://localhost:9001',
    );
    this.logger.log(`Boltz API URL: ${this.boltzApiUrl}`);
  }

  async getSwapInfo(): Promise<BoltzSwapInfoResponse> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<BoltzSwapInfoResponse>(`${this.boltzApiUrl}/v2/swap/submarine`).pipe(
          catchError((error: AxiosError) => {
            this.logger.error(`Failed to get swap info: ${error.message}`);
            throw new Error(`Boltz API error: ${error.message}`);
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error('Error fetching swap info', error);
      throw error;
    }
  }

  async createSubmarineSwap(
    request: CreateSubmarineSwapRequest,
  ): Promise<CreateSubmarineSwapResponse> {
    try {
      const { data } = await firstValueFrom(
        this.httpService
          .post<CreateSubmarineSwapResponse>(`${this.boltzApiUrl}/v2/swap/submarine`, request)
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(`Failed to create submarine swap: ${error.message}`);
              throw new Error(`Boltz API error: ${error.message}`);
            }),
          ),
      );
      return data;
    } catch (error) {
      this.logger.error('Error creating submarine swap', error);
      throw error;
    }
  }

  async createReverseSwap(
    request: CreateReverseSwapRequest,
  ): Promise<CreateReverseSwapResponse> {
    try {
      const { data } = await firstValueFrom(
        this.httpService
          .post<CreateReverseSwapResponse>(`${this.boltzApiUrl}/v2/swap/reverse`, request)
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(`Failed to create reverse swap: ${error.message}`);
              throw new Error(`Boltz API error: ${error.message}`);
            }),
          ),
      );
      return data;
    } catch (error) {
      this.logger.error('Error creating reverse swap', error);
      throw error;
    }
  }

  async getSwapStatus(swapId: string): Promise<SwapStatusResponse> {
    try {
      const { data} = await firstValueFrom(
        this.httpService.get<SwapStatusResponse>(`${this.boltzApiUrl}/v2/swap/status`, {
          params: { id: swapId },
        }).pipe(
          catchError((error: AxiosError) => {
            this.logger.error(`Failed to get swap status for ${swapId}: ${error.message}`);
            throw new Error(`Boltz API error: ${error.message}`);
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Error fetching swap status for ${swapId}`, error);
      throw error;
    }
  }

  async broadcastTransaction(currency: string, transactionHex: string): Promise<string> {
    try {
      const { data } = await firstValueFrom(
        this.httpService
          .post<{ transactionId: string }>(
            `${this.boltzApiUrl}/v2/chain/${currency}/transaction`,
            {
              hex: transactionHex,
            },
          )
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(`Failed to broadcast transaction: ${error.message}`);
              throw new Error(`Boltz API error: ${error.message}`);
            }),
          ),
      );
      return data.transactionId;
    } catch (error) {
      this.logger.error('Error broadcasting transaction', error);
      throw error;
    }
  }
}
