import { EvmClient, EvmClientParams } from '../shared/evm/evm-client';

export class BaseClient extends EvmClient {
  constructor(params: EvmClientParams) {
    super(params);
  }
}
