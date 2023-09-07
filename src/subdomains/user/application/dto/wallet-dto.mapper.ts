import { LightningHelper } from 'src/integration/blockchain/lightning/lightning-helper';
import { AssetDtoMapper } from 'src/subdomains/master-data/asset/dto/asset-dto.mapper';
import { AssetStatus } from '../../../master-data/asset/entities/asset.entity';
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
          asset: AssetDtoMapper.entityToDto(lw),
          ...(lw.asset.status === AssetStatus.ACTIVE
            ? {
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
