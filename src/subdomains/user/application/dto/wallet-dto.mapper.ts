import { LightningHelper } from 'src/integration/blockchain/lightning/lightning-helper';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetDtoMapper } from 'src/subdomains/master-data/asset/dto/asset-dto.mapper';
import { AssetStatus } from '../../../master-data/asset/entities/asset.entity';
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
          ...(lw.asset.status === AssetStatus.ACTIVE && lw.asset.blockchain === Blockchain.LIGHTNING
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
