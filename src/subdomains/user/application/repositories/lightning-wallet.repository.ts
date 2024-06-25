import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager, Equal } from 'typeorm';
import { LightningWalletEntity } from '../../domain/entities/lightning-wallet.entity';
import { LightningWalletTotalBalanceDto } from '../dto/lightning-wallet.dto';

@Injectable()
export class LightingWalletRepository extends BaseRepository<LightningWalletEntity> {
  constructor(manager: EntityManager) {
    super(LightningWalletEntity, manager);
  }

  async getByWalletId(lnbitsWalletId: string): Promise<LightningWalletEntity> {
    const lightningWallet = await this.findOneBy({ lnbitsWalletId: Equal(lnbitsWalletId) });
    if (!lightningWallet) throw new NotFoundException(`Lnbits Wallet not found by id ${lnbitsWalletId}`);

    return lightningWallet;
  }

  async getTotalBalances(): Promise<LightningWalletTotalBalanceDto[]> {
    return this.createQueryBuilder()
      .select('assetId')
      .addSelect('SUM(balance)', 'totalBalance')
      .groupBy('assetId')
      .getRawMany<LightningWalletTotalBalanceDto>();
  }
}
