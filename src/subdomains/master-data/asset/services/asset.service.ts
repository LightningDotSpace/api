import { Injectable, NotFoundException } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Equal, Not } from 'typeorm';
import { AssetAccountEntity, AssetAccountStatus } from '../entities/asset-account.entity';
import { AssetTransferEntity, AssetTransferStatus } from '../entities/asset-transfer.entity';
import { AssetAccountRepository } from '../repositories/asset-account.repository';
import { AssetTransferRepository } from '../repositories/asset-transfer.repository';

@Injectable()
export class AssetService {
  static readonly BTC_ACCOUNT_ASSET_NAME = 'BTC';
  static readonly CHF_ACCOUNT_ASSET_NAME = 'CHF';

  static readonly SAT_TRANSFER_ASSET_NAME = 'SAT';
  static readonly ZCHF_TRANSFER_ASSET_NAME = 'ZCHF';

  constructor(
    private readonly assetAccountRepo: AssetAccountRepository,
    private readonly assetTransferRepo: AssetTransferRepository,
  ) {}

  async getAccountAssetByIdOrThrow(id: number): Promise<AssetAccountEntity> {
    const asset = await this.assetAccountRepo.findOneBy({ id: Equal(id) });
    if (!asset) throw new NotFoundException(`Asset with id ${id} not found`);

    return asset;
  }

  async getAccountAssetByNameOrThrow(name: string): Promise<AssetAccountEntity> {
    const asset = await this.assetAccountRepo.findOneBy({ name: Equal(name) });
    if (!asset) throw new NotFoundException(`Asset with name ${name} not found`);

    return asset;
  }

  async getBtcAccountAssetOrThrow(): Promise<AssetAccountEntity> {
    return this.getAccountAssetByNameOrThrow(AssetService.BTC_ACCOUNT_ASSET_NAME);
  }

  async getChfAccountAssetOrThrow(): Promise<AssetAccountEntity> {
    return this.getAccountAssetByNameOrThrow(AssetService.CHF_ACCOUNT_ASSET_NAME);
  }

  async getTransferAssetByNameOrThrow(name: string, blockchain: Blockchain): Promise<AssetTransferEntity> {
    const asset = await this.assetTransferRepo.findOneBy({ name: Equal(name), blockchain: Equal(blockchain) });
    if (!asset) throw new NotFoundException(`Asset with ${name} of blockchain ${blockchain} not found`);

    return asset;
  }

  async getSatTransferAssetOrThrow(): Promise<AssetTransferEntity> {
    return this.getTransferAssetByNameOrThrow(AssetService.SAT_TRANSFER_ASSET_NAME, Blockchain.LIGHTNING);
  }

  async getZchfTransferAssetOrThrow(blockchain: Blockchain): Promise<AssetTransferEntity> {
    return this.getTransferAssetByNameOrThrow(AssetService.ZCHF_TRANSFER_ASSET_NAME, blockchain);
  }

  async getAllZchfTransferAssets(): Promise<AssetTransferEntity[]> {
    return this.assetTransferRepo.findBy({
      name: AssetService.ZCHF_TRANSFER_ASSET_NAME,
      blockchain: Not(Blockchain.LIGHTNING),
    });
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
