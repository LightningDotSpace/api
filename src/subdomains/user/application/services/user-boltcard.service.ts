import { Injectable } from '@nestjs/common';
import { BoltcardInfoDto, BoltcardWebhookTransferDto } from 'src/integration/blockchain/lightning/dto/boltcards.dto';
import { LightningClient } from 'src/integration/blockchain/lightning/lightning-client';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { LnbitsWebHookService } from 'src/integration/blockchain/lightning/services/lnbits-webhook.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { QueueHandler } from 'src/shared/utils/queue-handler';
import { LightningWalletService } from 'src/subdomains/user/application/services/lightning-wallet.service';
import { UserBoltcardEntity, UserBoltcardStatus } from '../../domain/entities/user-boltcard.entity';
import { LightingWalletRepository } from '../repositories/lightning-wallet.repository';
import { UserBoltcardRepository } from '../repositories/user-boltcard.repository';
import { WalletRepository } from '../repositories/wallet.repository';

@Injectable()
export class UserBoltcardService {
  private readonly logger = new LightningLogger(UserBoltcardService);

  private readonly client: LightningClient;

  private readonly boltcardWebhookMessageQueue: QueueHandler;

  constructor(
    readonly lightningService: LightningService,
    readonly lnbitsWebHookService: LnbitsWebHookService,
    private readonly lightningWalletService: LightningWalletService,
    private readonly userBoltcardRepository: UserBoltcardRepository,
    private readonly lightingWalletRepository: LightingWalletRepository,
    private readonly walletRepository: WalletRepository,
  ) {
    this.client = lightningService.getDefaultClient();

    this.boltcardWebhookMessageQueue = new QueueHandler();

    lnbitsWebHookService
      .getBoltcardWebhookObservable()
      .subscribe((webhookTransfer) => this.processBoltcardRequestMessageQueue(webhookTransfer));
  }

  private processBoltcardRequestMessageQueue(webhookTransfer: BoltcardWebhookTransferDto): void {
    this.boltcardWebhookMessageQueue
      .handle<void>(async () => this.processBoltcardRequest(webhookTransfer))
      .catch((e) => {
        this.logger.error('Error while processing new transactions', e);
      });
  }

  private async processBoltcardRequest(webhookTransfer: BoltcardWebhookTransferDto): Promise<void> {
    await this.updateBoltcards(webhookTransfer.changed);
    await this.deleteBoltcards(webhookTransfer.deleted);
  }

  private async updateBoltcards(boltcards: BoltcardInfoDto[]): Promise<UserBoltcardEntity[]> {
    const updatedBoltcardEntities: UserBoltcardEntity[] = [];

    for (const boltcard of boltcards) {
      let dbBoltcardEntity = await this.userBoltcardRepository.findOneBy({ boltcardId: boltcard.id });

      if (!dbBoltcardEntity) {
        const lightningWallet = await this.lightningWalletService.getLightningWallet(boltcard.wallet);
        dbBoltcardEntity = UserBoltcardEntity.create(boltcard, lightningWallet);
      } else {
        Object.assign(dbBoltcardEntity, UserBoltcardEntity.create(boltcard));
      }

      const updatedBoltcardEntity = await this.userBoltcardRepository.save(dbBoltcardEntity);
      updatedBoltcardEntities.push(updatedBoltcardEntity);
    }

    return updatedBoltcardEntities;
  }

  private async deleteBoltcards(boltcardIds: string[]): Promise<void> {
    for (const boltcardId of boltcardIds) {
      await this.userBoltcardRepository.update({ boltcardId }, { status: UserBoltcardStatus.DELETED });
    }
  }

  async syncUserBoltcards(addresses: string[]): Promise<UserBoltcardEntity[]> {
    const adminKeys: string[] = [];

    if (addresses.length) {
      for (const address of addresses) {
        const walletEntity = await this.walletRepository.findOneBy({ address: address });

        if (walletEntity) {
          adminKeys.push(...walletEntity.lightningWallets.map((lw) => lw.adminKey));
        } else {
          this.logger.error(`${address}: Wallet not found`);
        }
      }
    } else {
      const lightningWalletIterator = this.lightingWalletRepository.getRawIterator<{ adminKey: string }>(
        100,
        'adminKey',
      );
      let lightningWalletInfo = await lightningWalletIterator.next();

      while (lightningWalletInfo.length) {
        adminKeys.push(...lightningWalletInfo.map((lw) => lw.adminKey));

        lightningWalletInfo = await lightningWalletIterator.next();
      }
    }

    return this.doSyncUserBoltcards(adminKeys);
  }

  private async doSyncUserBoltcards(adminKeys: string[]): Promise<UserBoltcardEntity[]> {
    const syncedBoltcardEntities: UserBoltcardEntity[] = [];

    for (const adminKey of adminKeys) {
      const boltcards = await this.client.getBoltcards(adminKey);

      if (boltcards.length) {
        const updatedBoltcardEntities = await this.updateBoltcards(boltcards);
        syncedBoltcardEntities.push(...updatedBoltcardEntities);
      }
    }

    return syncedBoltcardEntities;
  }
}
