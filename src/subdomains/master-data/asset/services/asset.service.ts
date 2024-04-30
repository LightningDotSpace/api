import { Injectable, NotFoundException } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetAccountEntity, AssetAccountStatus } from '../entities/asset-account.entity';
import { AssetTransferEntity, AssetTransferStatus } from '../entities/asset-transfer.entity';
import { AssetEntity } from '../entities/asset.entity';
import { AssetAccountRepository } from '../repositories/asset-account.repository';
import { AssetTransferRepository } from '../repositories/asset-transfer.repository';
import { AssetRepository } from '../repositories/asset.repository';

@Injectable()
export class AssetService {
  static readonly BTC_ASSET_NAME = 'BTC';
  static readonly SAT_ASSET_NAME = 'SAT';
  static readonly ZCHF_ASSET_NAME = 'ZCHF';

  constructor(
    private readonly assetRepo: AssetRepository,
    private readonly assetAccountRepo: AssetAccountRepository,
    private readonly assetTransferRepo: AssetTransferRepository,
  ) {}

  async getAssetByNameOrThrow(name: string): Promise<AssetEntity> {
    const asset = await this.assetRepo.findOneBy({ name });
    if (!asset) throw new NotFoundException(`Asset ${name} not found`);

    return asset;
  }

  async getAccountAssetByNameOrThrow(name: string): Promise<AssetAccountEntity> {
    const asset = await this.assetAccountRepo.findOneBy({ name });
    if (!asset) throw new NotFoundException(`Asset ${name} not found`);

    return asset;
  }

  async getBtcAccountAssetOrThrow(): Promise<AssetAccountEntity> {
    return this.getAccountAssetByNameOrThrow(AssetService.BTC_ASSET_NAME);
  }

  async getTransferAssetByNameOrThrow(name: string, blockchain: Blockchain): Promise<AssetTransferEntity> {
    const asset = await this.assetTransferRepo.findOneBy({ name, blockchain });
    if (!asset) throw new NotFoundException(`Asset ${name} of blockchain ${blockchain} not found`);

    return asset;
  }

  async getSatTransferAssetOrThrow(): Promise<AssetTransferEntity> {
    return this.getTransferAssetByNameOrThrow(AssetService.SAT_ASSET_NAME, Blockchain.LIGHTNING);
  }

  async getZchfTransferAssetOrThrow(blockchain: Blockchain): Promise<AssetTransferEntity> {
    return this.getTransferAssetByNameOrThrow(AssetService.ZCHF_ASSET_NAME, blockchain);
  }

  async getActiveAccountAssets(params?: { name?: string; symbol?: string }): Promise<AssetAccountEntity[]> {
    return this.assetAccountRepo.findBy({
      status: AssetAccountStatus.ACTIVE,
      name: params?.name?.toUpperCase(),
      symbol: params?.symbol,
    });
  }

  async getActiveTransferAssets(name?: string): Promise<AssetTransferEntity[]> {
    return this.assetTransferRepo.findBy({
      status: AssetTransferStatus.ACTIVE,
      name: name?.toUpperCase(),
    });
  }
}
