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
    lightningWallet: LightningWalletEntity,
  ): Promise<EvmPaymentRequestDto> {
    await this.paymentRequestService.checkDuplicate(walletPaymentParam);

    const amount = walletPaymentParam.amount;
    if (!amount) throw new NotFoundException(`Lightning Wallet ${lightningWallet.id}: amount not found`);

    const pr = await this.getPaymentRequests(Number(amount));
    const expiryDate = Util.secondsAfter(PaymentRequestService.MAX_TIMEOUT_SECONDS);

    const accountAsset = await this.assetService.getChfAccountAssetOrThrow();

    await this.paymentRequestService.savePaymentRequest(
      accountAsset,
      Number(amount),
      Number(amount),
      JSON.stringify(pr),
      expiryDate,
      PaymentRequestMethod.EVM,
      lightningWallet,
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
        pr.push({ blockchain, uri: this.createEvmURI(activeEvmTransferAsset.address, chainId, amount) });
      }
    }

    return pr;
  }

  private createEvmURI(assetAddress: string, chainId: number, amount: number): string {
    const paymentAddress = Config.evmPaymentAddress;
    const decimals = 18;

    return `ethereum:${assetAddress}@${chainId}/transfer?address=${paymentAddress}&uint256=${EvmUtil.toWeiAmount(
      amount,
      decimals,
    ).toString()}`;
  }
}
