import { Injectable, NotFoundException } from '@nestjs/common';
import { Config } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Util } from 'src/shared/utils/util';
import { AlchemyNetworkMapper } from 'src/subdomains/alchemy/alchemy-network-mapper';
import { LightingWalletPaymentParamDto } from 'src/subdomains/lightning/dto/lightning-wallet.dto';
import { AssetService } from 'src/subdomains/master-data/asset/services/asset.service';
import { EvmPaymentRequestDto, EvmPaymentUriDto } from 'src/subdomains/payment-request/dto/payment-request.dto';
import { PaymentRequestMethod } from 'src/subdomains/payment-request/entities/payment-request.entity';
import { PaymentRequestService } from 'src/subdomains/payment-request/services/payment-request.service';
import { LightningWalletEntity } from 'src/subdomains/user/domain/entities/lightning-wallet.entity';
import { EvmUtil } from '../../evm.util';

@Injectable()
export class EvmPaymentService {
  constructor(
    private readonly assetService: AssetService,
    private readonly paymentRequestService: PaymentRequestService,
  ) {}

  async createPaymentRequest(
    walletPaymentParam: LightingWalletPaymentParamDto,
    chfLightningWallet: LightningWalletEntity,
  ): Promise<EvmPaymentRequestDto> {
    await this.paymentRequestService.checkDuplicate(walletPaymentParam, [PaymentRequestMethod.EVM]);

    const invoiceAmount = walletPaymentParam.amount;
    if (!invoiceAmount)
      throw new NotFoundException(`Lightning Wallet ${chfLightningWallet.id}: invoice amount not found`);

    const pr = await this.getPaymentRequests(+invoiceAmount);
    const expiryDate = Util.secondsAfter(Config.payment.timeout);

    const invoiceAsset = await this.assetService.getChfAccountAssetOrThrow();

    await this.paymentRequestService.savePaymentRequest(
      invoiceAsset,
      Number(invoiceAmount),
      Number(invoiceAmount),
      JSON.stringify(pr),
      expiryDate,
      PaymentRequestMethod.EVM,
      chfLightningWallet,
    );

    return { expiryDate, pr };
  }

  private async getPaymentRequests(amount: number): Promise<EvmPaymentUriDto[]> {
    const pr: EvmPaymentUriDto[] = [];

    const activeTransferAssets = await this.assetService.getActiveTransferAssets();
    const activeEvmTransferAssets = activeTransferAssets.filter((a) => a.blockchain !== Blockchain.LIGHTNING);

    for (const activeEvmTransferAsset of activeEvmTransferAssets) {
      const blockchain = activeEvmTransferAsset.blockchain;
      const chainId = AlchemyNetworkMapper.getChainId(blockchain);

      if (chainId) {
        pr.push({ blockchain, uri: this.createEvmUri(activeEvmTransferAsset.address, chainId, amount) });
      }
    }

    return pr;
  }

  private createEvmUri(assetAddress: string, chainId: number, amount: number): string {
    const paymentAddress = Config.payment.evmAddress;
    const decimals = 18;

    return `ethereum:${assetAddress}@${chainId}/transfer?address=${paymentAddress}&uint256=${EvmUtil.toWeiAmount(
      amount,
      decimals,
    ).toString()}`;
  }
}
