import { LightningWallet } from 'src/subdomains/user/domain/entities/lightning-wallet.entity';
import { AssetDto } from './asset.dto';

export class AssetDtoMapper {
  static entityToDto(lightningWallet: LightningWallet): AssetDto {
    const dto: AssetDto = {
      name: lightningWallet.asset.name,
      displayName: lightningWallet.asset.displayName,
      description: lightningWallet.asset.description,
      status: lightningWallet.asset.status,
    };

    return Object.assign(new AssetDto(), dto);
  }
}
