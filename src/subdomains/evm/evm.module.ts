import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlchemyWebhookModule } from '../alchemy/alchemy-webhook.module';
import { AssetModule } from '../master-data/asset/asset.module';
import { PaymentRequestModule } from '../payment-request/payment-request.module';
import { UserModule } from '../user/user.module';
import { RegisterStrategyRegistry } from './common/register.strategy-registry';
import { TransactionEvmEntity } from './entities/transaction-evm.entity';
import { EvmPaymentService } from './payment/services/evm-payment.service';
import { TransactionEvmService } from './payment/services/transaction-evm.service';
import { ArbitrumPaymentStrategy } from './payment/strategies/arbitrum-payment.strategy';
import { BasePaymentStrategy } from './payment/strategies/base-payment.strategy';
import { EthereumPaymentStrategy } from './payment/strategies/ethereum-payment.strategy';
import { OptimismPaymentStrategy } from './payment/strategies/optimism-payment.strategy';
import { PolygonPaymentStrategy } from './payment/strategies/polygon-payment.strategy';
import { TransactionEvmRepository } from './repositories/transaction-evm.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEvmEntity]),
    UserModule,
    AssetModule,
    AlchemyWebhookModule,
    PaymentRequestModule,
  ],
  controllers: [],
  providers: [
    TransactionEvmRepository,
    TransactionEvmService,
    EvmPaymentService,
    RegisterStrategyRegistry,
    EthereumPaymentStrategy,
    ArbitrumPaymentStrategy,
    OptimismPaymentStrategy,
    PolygonPaymentStrategy,
    BasePaymentStrategy,
  ],
  exports: [EvmPaymentService],
})
export class EvmModule {}
