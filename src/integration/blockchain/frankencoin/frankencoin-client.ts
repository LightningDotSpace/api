import { Contract, ethers } from 'ethers';
import { Config } from 'src/config/config';
import { HttpService } from 'src/shared/services/http.service';
import ERC20_ABI from '../shared/evm/abi/erc20.abi.json';
import FRANKENCOIN_EQUITY_ABI from '../shared/evm/abi/frankencoin-equity.abi.json';
import FRANKENCOIN_ABI from '../shared/evm/abi/frankencoin.abi.json';

export class FrankencoinClient {
  private provider: ethers.providers.JsonRpcProvider;

  constructor(private readonly http: HttpService, gatewayUrl: string, apiKey: string) {
    const providerUrl = `${gatewayUrl}/${apiKey}`;
    this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
  }

  async getTvl(): Promise<number> {
    return this.http.get<number>(`${Config.blockchain.frankencoin.tvlUrl}`);
  }

  getErc20Contract(collateralAddress: string): Contract {
    return new Contract(collateralAddress, ERC20_ABI, this.provider);
  }

  getFrankencoinContract(contractAddress: string): Contract {
    return new Contract(contractAddress, FRANKENCOIN_ABI, this.provider);
  }

  getEquityContract(collateralAddress: string): Contract {
    return new Contract(collateralAddress, FRANKENCOIN_EQUITY_ABI, this.provider);
  }
}
