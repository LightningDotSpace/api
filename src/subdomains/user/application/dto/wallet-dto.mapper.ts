import { LightningHelper } from 'src/integration/blockchain/lightning/lightning-helper';
import { AssetDtoMapper } from 'src/subdomains/master-data/asset/dto/asset-account-dto.mapper';
import { AssetAccountStatus } from '../../../master-data/asset/entities/asset-account.entity';
import { WalletEntity } from '../../domain/entities/wallet.entity';
import { WalletDto } from './wallet.dto';

export class WalletDtoMapper {
  static entityToDto(wallet: WalletEntity): WalletDto {
    const dto: WalletDto = {
      address: wallet.address,
      lightning: {
        address: LightningHelper.getLightningAddress(wallet.lnbitsAddress),
        addressLnurl: LightningHelper.getLightningAddressAsLnurl(wallet.lnbitsAddress),
        addressOwnershipProof: wallet.addressOwnershipProof,
        wallets: wallet.lightningWallets.map((lw) => ({
          asset: AssetDtoMapper.entityToDto(lw.asset),
          ...(lw.asset.status === AssetAccountStatus.ACTIVE
            ? {
                lnbitsWalletId: lw.lnbitsWalletId,
                lndhubAdminUrl: LightningHelper.getLndhubUrl('admin', lw.adminKey),
                lndhubInvoiceUrl: LightningHelper.getLndhubUrl('invoice', lw.invoiceKey),
              }
            : undefined),
        })),
      },
    };

    return Object.assign(new WalletDto(), dto);
  }
}
