import { Asset } from '../entities/asset.entity';
import { AssetDto } from './asset.dto';

export class AssetDtoMapper {
  static entityToDto(asset: Asset): AssetDto {
    const dto: AssetDto = {
      name: asset.name,
      displayName: asset.displayName,
      description: asset.description,
      status: asset.status,
    };

    return Object.assign(new AssetDto(), dto);
  }
}
