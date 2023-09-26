import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { LightningWallet } from '../../domain/entities/lightning-wallet.entity';

@Injectable()
export class LightingWalletRepository extends BaseRepository<LightningWallet> {
  constructor(manager: EntityManager) {
    super(LightningWallet, manager);
  }

  async getByWalletId(lnbitsWalletId: string): Promise<LightningWallet> {
    const lightningWallet = await this.findOneBy({ lnbitsWalletId: lnbitsWalletId });
    if (!lightningWallet) throw new NotFoundException(`Lnbits Wallet not found by id ${lnbitsWalletId}`);

    return lightningWallet;
  }
}
