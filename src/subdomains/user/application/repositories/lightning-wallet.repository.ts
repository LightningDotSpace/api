import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { LightningWalletEntity } from '../../domain/entities/lightning-wallet.entity';

@Injectable()
export class LightingWalletRepository extends BaseRepository<LightningWalletEntity> {
  constructor(manager: EntityManager) {
    super(LightningWalletEntity, manager);
  }

  async getByWalletId(lnbitsWalletId: string): Promise<LightningWalletEntity> {
    const lightningWallet = await this.findOneBy({ lnbitsWalletId: lnbitsWalletId });
    if (!lightningWallet) throw new NotFoundException(`Lnbits Wallet not found by id ${lnbitsWalletId}`);

    return lightningWallet;
  }
}
