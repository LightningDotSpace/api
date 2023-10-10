import { AssetEntity } from '../entities/asset.entity';
import { AssetDto } from './asset.dto';

export class AssetDtoMapper {
  static entityToDto(asset: AssetEntity): AssetDto {
    const dto: AssetDto = {
      name: asset.name,
      displayName: asset.displayName,
      description: asset.description,
      status: asset.status,
    };

    return Object.assign(new AssetDto(), dto);
  }
}
