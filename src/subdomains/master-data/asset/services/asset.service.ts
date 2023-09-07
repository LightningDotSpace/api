import { Injectable, NotFoundException } from '@nestjs/common';
import { Asset } from '../entities/asset.entity';
import { AssetRepository } from '../repositories/asset.repository';

@Injectable()
export class AssetService {
  constructor(private readonly assetRepo: AssetRepository) {}

  async getAssetByName(name: string): Promise<Asset> {
    const asset = await this.assetRepo.findOneBy({ name });
    if (!asset) throw new NotFoundException('Asset not found');

    return asset;
  }
}
