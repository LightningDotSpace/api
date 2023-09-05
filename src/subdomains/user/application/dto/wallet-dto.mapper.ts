import { LightningHelper } from 'src/integration/blockchain/lightning/lightning-helper';
import { AssetStatus } from '../../domain/entities/asset.entity';
import { Wallet } from '../../domain/entities/wallet.entity';
import { WalletDto } from './wallet.dto';

export class WalletDtoMapper {
  static entityToDto(wallet: Wallet): WalletDto {
    const dto: WalletDto = {
      address: wallet.address,
      lightning: {
        address: LightningHelper.getLightningAddress(wallet.lnbitsAddress),
        addressLnurl: LightningHelper.getLightningAddressAsLnurl(wallet.lnbitsAddress),
        addressOwnershipProof: wallet.addressOwnershipProof,
        wallets: wallet.lightningWallets.map((lw) => ({
          asset: {
            name: lw.asset.name,
            displayName: lw.asset.displayName,
            description: lw.asset.description,
            status: lw.asset.status,
          },
          lndhubAdminUrl:
            lw.asset.status === AssetStatus.ACTIVE ? LightningHelper.getLndhubUrl('admin', lw.adminKey) : '',
          lndhubInvoiceUrl:
            lw.asset.status === AssetStatus.ACTIVE ? LightningHelper.getLndhubUrl('invoice', lw.invoiceKey) : '',
        })),
      },
    };

    return Object.assign(new WalletDto(), dto);
  }
}
