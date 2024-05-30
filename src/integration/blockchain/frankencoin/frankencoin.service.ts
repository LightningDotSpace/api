import { Injectable } from '@nestjs/common';
import { Config, GetConfig } from 'src/config/config';
import { HttpService } from 'src/shared/services/http.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { EvmUtil } from 'src/subdomains/evm/evm.util';
import { FrankencoinClient } from './frankencoin-client';

@Injectable()
export class FrankencoinService {
  private readonly logger = new LightningLogger(FrankencoinService);

  private readonly client: FrankencoinClient;

  constructor(http: HttpService) {
    const { gatewayUrl, apiKey } = GetConfig().blockchain.frankencoin;

    this.client = new FrankencoinClient(http, gatewayUrl, apiKey);
  }

  async getZchfTotalSupply(): Promise<number> {
    const frankencoinContract = this.client.getFrankencoinContract(Config.blockchain.frankencoin.contractAddress.zchf);
    const zchfTotalSupply = await frankencoinContract.totalSupply();

    return EvmUtil.fromWeiAmount(zchfTotalSupply);
  }

  async getFpsMarketCap(): Promise<number> {
    const equityContract = this.client.getEquityContract(Config.blockchain.frankencoin.contractAddress.equity);
    const fpsTotalSupply = await equityContract.totalSupply();
    const fpsPrice = await equityContract.price();

    return EvmUtil.fromWeiAmount(fpsTotalSupply) * EvmUtil.fromWeiAmount(fpsPrice);
  }

  async getTvl(): Promise<number> {
    return this.client.getTvl();
  }
}
