import { Injectable } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Registry } from '../../../shared/utils/registry';
import { RegisterStrategy } from './register.strategy';

@Injectable()
export class RegisterStrategyRegistry extends Registry<Blockchain, RegisterStrategy> {
  getRegisterStrategy(blockchain: Blockchain): RegisterStrategy {
    const strategy = super.get(blockchain);

    if (!strategy) {
      throw new Error(`No registered strategy found for Blockchain: ${blockchain}`);
    }

    return strategy;
  }
}
