import { EvmClient, EvmClientParams } from '../shared/evm/evm-client';

export class ArbitrumClient extends EvmClient {
  constructor(params: EvmClientParams) {
    super(params);
  }
}
