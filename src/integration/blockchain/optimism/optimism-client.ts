import { EvmClient, EvmClientParams } from '../shared/evm/evm-client';

export class OptimismClient extends EvmClient {
  constructor(params: EvmClientParams) {
    super(params);
  }
}
