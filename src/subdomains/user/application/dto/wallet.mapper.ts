import { LightningHelper } from 'src/integration/blockchain/lightning/lightning-helper';
import { Wallet } from '../../domain/entities/wallet.entity';
import { WalletDto } from './wallet.dto';

export class WalletMapper {
  static toDto(wallet: Wallet): WalletDto {
    const dto: WalletDto = {
      address: wallet.address,
      lightning: {
        address: LightningHelper.getLightningAddress(wallet.lnbitsAddress),
        addressLnurl: LightningHelper.getLightningAddressAsLnurl(wallet.lnbitsAddress),
        addressOwnershipProof: wallet.addressOwnershipProof,
        wallets: wallet.lightningWallets.map((lw) => ({
          asset: lw.asset,
          lndhubAdminUrl: LightningHelper.getLndhubUrl('admin', lw.adminKey),
          lndhubInvoiceUrl: LightningHelper.getLndhubUrl('invoice', lw.invoiceKey),
        })),
      },
    };

    return Object.assign(new WalletDto(), dto);
  }
}
