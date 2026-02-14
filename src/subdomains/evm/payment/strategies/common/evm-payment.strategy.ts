import { Inject, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { QueueHandler } from 'src/shared/utils/queue-handler';
import { Util } from 'src/shared/utils/util';
import { AlchemyNetworkMapper } from 'src/subdomains/alchemy/alchemy-network-mapper';
import { AssetService } from 'src/subdomains/master-data/asset/services/asset.service';
import { AlchemyWebhookActivityDto, AlchemyWebhookDto } from '../../../../alchemy/dto/alchemy-webhook.dto';
import { AlchemyWebhookService } from '../../../../alchemy/services/alchemy-webhook.service';
import { RegisterStrategy } from '../../../common/register.strategy';
import { TransactionEvmService } from '../../services/transaction-evm.service';

export abstract class EvmPaymentStrategy extends RegisterStrategy implements OnModuleInit, OnModuleDestroy {
  protected readonly logger = new LightningLogger(EvmPaymentStrategy);

  private addressWebhookMessageQueue: QueueHandler;

  @Inject() private readonly alchemyWebhookService: AlchemyWebhookService;
  @Inject() private readonly assetService: AssetService;
  @Inject() private readonly transactionEvmService: TransactionEvmService;

  constructor() {
    super();
  }

  onModuleInit() {
    super.onModuleInit();

    this.addressWebhookMessageQueue = new QueueHandler();

    const network = AlchemyNetworkMapper.toAlchemyNetworkByBlockchain(this.blockchain);
    if (!network) {
      this.logger.info(`No network configured for blockchain ${this.blockchain}, skipping webhook setup`);
      return;
    }

    this.alchemyWebhookService
      .getFrankencoinPaymentWebhookObservable(network)
      .subscribe((dto) => this.processPaymentWebhookMessageQueue(dto));
  }

  onModuleDestroy() {
    super.onModuleDestroy();
  }

  // --- ABSTRACTS --- //

  protected abstract get ownAddress(): string;

  // --- WEBHOOKS --- //

  protected processPaymentWebhookMessageQueue(dto: AlchemyWebhookDto): void {
    this.addressWebhookMessageQueue
      .handle<void>(async () => this.processPaymentWebhookTransactions(dto))
      .catch((e) => {
        this.logger.error('Error while process new zchf payment', e);
      });
  }

  private async processPaymentWebhookTransactions(webhookDto: AlchemyWebhookDto): Promise<void> {
    const zchfAsset = await this.assetService.getZchfTransferAssetOrThrow(this.blockchain);

    if (!zchfAsset.address)
      throw new NotFoundException(`Contract address for ZCHF for blockchain ${this.blockchain} not found`);

    const relevantTransactions = await this.filterWebhookTransactionsByRelevantAddresses(webhookDto, zchfAsset.address);

    for (const transaction of relevantTransactions) {
      await this.transactionEvmService.saveTransaction(transaction, this.blockchain, zchfAsset);
    }
  }

  private async filterWebhookTransactionsByRelevantAddresses(
    webhookDto: AlchemyWebhookDto,
    zchfContractAddress: string,
  ): Promise<AlchemyWebhookActivityDto[]> {
    const notFromOwnAddresses = webhookDto.event.activity.filter(
      (tx) => !Util.equalsIgnoreCase(this.ownAddress, tx.fromAddress),
    );

    return notFromOwnAddresses.filter((tx) => Util.equalsIgnoreCase(tx.rawContract.address, zchfContractAddress));
  }
}
