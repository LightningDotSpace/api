import { Injectable, Logger } from '@nestjs/common';
import { BoltzApiClientService } from './boltz-api-client.service';
import { CreateSubmarineSwapDto, CreateReverseSwapDto } from '../dto/create-submarine-swap.dto';

@Injectable()
export class AtomicSwapService {
  private readonly logger = new Logger(AtomicSwapService.name);

  constructor(private readonly boltzClient: BoltzApiClientService) {}

  async getSwapInfo() {
    this.logger.log('Fetching swap info from Boltz');
    return this.boltzClient.getSwapInfo();
  }

  async createSubmarineSwap(dto: CreateSubmarineSwapDto) {
    this.logger.log(`Creating submarine swap for invoice: ${dto.invoice.substring(0, 20)}...`);

    const request = {
      type: 'submarine' as const,
      pairId: dto.pairId || 'BTC/BTC',
      orderSide: dto.orderSide || ('buy' as const),
      invoice: dto.invoice,
      refundPublicKey: dto.refundPublicKey,
      channel: dto.channel,
    };

    return this.boltzClient.createSubmarineSwap(request);
  }

  async createReverseSwap(dto: CreateReverseSwapDto) {
    this.logger.log(`Creating reverse swap for amount: ${dto.invoiceAmount} sats`);

    const request = {
      type: 'reversesubmarine' as const,
      pairId: dto.pairId || 'BTC/BTC',
      orderSide: dto.orderSide || ('sell' as const),
      invoiceAmount: dto.invoiceAmount,
      preimageHash: dto.preimageHash,
      claimPublicKey: dto.claimPublicKey,
      address: dto.address,
      addressSignature: dto.addressSignature,
    };

    return this.boltzClient.createReverseSwap(request);
  }

  async getSwapStatus(swapId: string) {
    this.logger.log(`Fetching status for swap: ${swapId}`);
    return this.boltzClient.getSwapStatus(swapId);
  }

  async broadcastTransaction(currency: string, transactionHex: string) {
    this.logger.log(`Broadcasting ${currency} transaction`);
    return this.boltzClient.broadcastTransaction(currency, transactionHex);
  }
}
