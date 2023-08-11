import { Injectable } from '@nestjs/common';
import { LnBitsUserDto } from 'src/integration/blockchain/lightning/dto/lnbits.dto';
import { LightningWallet } from '../../domain/entities/lightning-wallet.entity';
import { Wallet } from '../../domain/entities/wallet.entity';
import { LightningWalletRepository } from '../repositories/lightning-wallet.repository';

@Injectable()
export class LightningWalletService {
  constructor(private readonly repo: LightningWalletRepository) {}

  async create(wallet: Wallet, lnbitsUser: LnBitsUserDto): Promise<LightningWallet[]> {
    const lightningWallets: LightningWallet[] = [];

    const lnbitsUserWallets = lnbitsUser.wallets;

    for (const lnbitsUserWallet of lnbitsUserWallets) {
      const lightningWallet = this.repo.create({
        lightningWalletId: lnbitsUserWallet.wallet.id,
        asset: lnbitsUserWallet.wallet.name,
        adminKey: lnbitsUserWallet.wallet.adminkey,
        invoiceKey: lnbitsUserWallet.wallet.inkey,
        lnurlpId: lnbitsUserWallet.lnurlp.id,
        wallet: wallet,
      });

      lightningWallets.push(await this.repo.save(lightningWallet));
    }

    return lightningWallets;
  }
}
