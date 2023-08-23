import { Config } from 'src/config/config';
import { Wallet } from '../../domain/entities/wallet.entity';
import { WalletDto } from './wallet.dto';

export class WalletMapper {
  static toDto(wallet: Wallet): WalletDto {
    const dto: WalletDto = {
      address: wallet.address,
      lightning: {
        address: `${wallet.address}@${Config.url}`,
        wallets: wallet.lightningWallets.map((lw) => ({
          asset: lw.asset,
          lndhubAdminUrl: this.getLndhubUrl('admin', lw.adminKey),
          lndhubInvoiceUrl: this.getLndhubUrl('invoice', lw.invoiceKey),
        })),
      },
    };

    return Object.assign(new WalletDto(), dto);
  }

  private static getLndhubUrl(type: string, key: string): string {
    return `lndhub://${type}:${key}@${Config.blockchain.lightning.lnbits.lndhubUrl}`;
  }
}
