import { AssetAccountEntity } from '../entities/asset-account.entity';
import { AssetAccountDto } from './asset-account.dto';

export class AssetDtoMapper {
  static entityToDto(asset: AssetAccountEntity): AssetAccountDto {
    const dto: AssetAccountDto = {
      name: asset.name,
      displayName: asset.displayName,
      status: asset.status,
      symbol: asset.symbol,
      minSendable: asset.minSendable,
      maxSendable: asset.maxSendable,
      decimals: asset.decimals,
    };

    return Object.assign(new AssetAccountDto(), dto);
  }
}
