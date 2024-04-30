import { Injectable } from '@nestjs/common';
import { LnBitsLnurlpInvoiceDto } from 'src/integration/blockchain/lightning/dto/lnbits.dto';
import { Blockchain, blockchainFindBy } from 'src/shared/enums/blockchain.enum';
import { AlchemyNetworkMapper } from 'src/subdomains/alchemy/alchemy-network-mapper';
import { LightingWalletPaymentParamDto } from 'src/subdomains/lightning/dto/lightning-wallet.dto';
import { AssetService } from 'src/subdomains/master-data/asset/services/asset.service';
import { PaymentRequestService } from 'src/subdomains/payment-request/services/payment-request.service';
import { LightningWalletEntity } from 'src/subdomains/user/domain/entities/lightning-wallet.entity';
import { EvmUtil } from '../../evm.util';

@Injectable()
export class EvmPaymentService {
  constructor(
    private readonly assetService: AssetService,
    private readonly paymentRequestService: PaymentRequestService,
  ) {}

  async getPaymentRequest(amount: number, blockchain: Blockchain): Promise<string> {
    const asset = await this.assetService.getZchfTransferAssetOrThrow(blockchain);
    const decimals = 18;

    const chainId = AlchemyNetworkMapper.getChainId(blockchain);

    return `ethereum:${asset.address}@${chainId}/transfer?address=${asset.address}&uint256=${EvmUtil.toWeiAmount(
      amount,
      decimals,
    ).toString()}`;
  }

  async createPaymentRequest(
    walletPaymentParam: LightingWalletPaymentParamDto,
    lightningWallet: LightningWalletEntity,
  ): Promise<LnBitsLnurlpInvoiceDto> {
    const amount = walletPaymentParam.amount;
    const method = walletPaymentParam.method;
    if (!amount || !method) return { pr: '', routes: [] };

    const blockchain = blockchainFindBy(method);
    if (!blockchain) return { pr: '', routes: [] };

    const pr = await this.getPaymentRequest(Number(amount), blockchain);

    const accountAmount = walletPaymentParam.amount;
    const transferAmount = walletPaymentParam.amount;
    if (!accountAmount || !transferAmount) return { pr: '', routes: [] };

    await this.paymentRequestService.savePaymentRequest(
      Number(accountAmount),
      Number(transferAmount),
      pr,
      blockchain,
      lightningWallet,
    );

    return { pr: pr, routes: [] };
  }
}
