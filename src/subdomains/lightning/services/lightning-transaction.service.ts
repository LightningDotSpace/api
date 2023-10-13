import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import {
  LndOnchainTransactionDto,
  LndTransactionDto,
  LndTransactionResponseDto,
} from 'src/integration/blockchain/lightning/dto/lnd.dto';
import { LightningHelper } from 'src/integration/blockchain/lightning/lightning-helper';
import { LightningWebSocketService } from 'src/integration/blockchain/lightning/services/lightning-ws.service';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { Lock } from 'src/shared/utils/lock';
import { QueueHandler } from 'src/shared/utils/queue-handler';
import { Util } from 'src/shared/utils/util';
import { LessThan } from 'typeorm';
import { LightningClient } from '../../../integration/blockchain/lightning/lightning-client';
import { LightningTransactionDtoMapper } from '../dto/lightning-transaction-dto.mapper';
import { LightningTransactionDto } from '../dto/lightning-transaction.dts';
import {
  TransactionLightningEntity,
  TransactionLightningState,
  TransactionLightningType,
} from '../entities/transaction-lightning.entity';
import { TransactionOnchainEntity } from '../entities/transaction-onchain.entity';
import { TransactionLightningRepository } from '../repositories/transaction-lightning.repository';
import { TransactionOnchainRepository } from '../repositories/transaction-onchain.repository';

@Injectable()
export class LightningTransactionService {
  private readonly logger = new LightningLogger(LightningTransactionService);

  private readonly client: LightningClient;

  private readonly onchainTransactionMessageQueue: QueueHandler;
  private readonly invoiceTransactionMessageQueue: QueueHandler;
  private readonly paymentTransactionMessageQueue: QueueHandler;

  constructor(
    lightningService: LightningService,
    readonly lightningWebSocketService: LightningWebSocketService,
    private readonly transactionOnchainRepo: TransactionOnchainRepository,
    private readonly transactionLightningRepo: TransactionLightningRepository,
  ) {
    this.client = lightningService.getDefaultClient();

    this.onchainTransactionMessageQueue = new QueueHandler();
    this.invoiceTransactionMessageQueue = new QueueHandler();
    this.paymentTransactionMessageQueue = new QueueHandler();

    lightningWebSocketService.onChainTransactions.subscribe((m) => this.handleOnchainTransactionMessage(m));
    lightningWebSocketService.invoiceTransactions.subscribe((m) => this.handleInvoiceTransactionMessage(m));
    lightningWebSocketService.paymentTransactions.subscribe((m) => this.handlePaymentTransactionMessage(m));
  }

  async getLightningTransactionByTransaction(transaction: string): Promise<TransactionLightningEntity> {
    return this.transactionLightningRepo.getByTransaction(transaction);
  }

  async getTransactionInfo(id: string): Promise<LightningTransactionDto[]> {
    if (64 !== id.length || '0'.repeat(64) === id) throw new BadRequestException(`invalid id: ${id}`);

    const transactionEntities = await this.transactionLightningRepo.findBy([{ transaction: id }, { secret: id }]);
    if (!transactionEntities.length) throw new NotFoundException(`no transaction found: ${id}`);

    return LightningTransactionDtoMapper.entitiesToDto(transactionEntities);
  }

  @Cron(CronExpression.EVERY_HOUR)
  @Lock()
  async processUpdateOpenInvoices(): Promise<void> {
    if (Config.processDisabled(Process.UPDATE_INVOICE)) return;

    try {
      const openInvoices = await this.transactionLightningRepo.findBy({
        type: TransactionLightningType.INVOICE,
        state: TransactionLightningState.OPEN,
        expiresTimestamp: LessThan(new Date()),
      });

      for (const openInvoice of openInvoices) {
        await this.transactionLightningRepo.update(openInvoice.id, {
          state: TransactionLightningState.CANCELED,
        });
      }
    } catch (e) {
      this.logger.error('Error while updating open invoices', e);
    }
  }

  async syncOnchainTransactions(
    blockHeightStart?: number,
    blockHeightEnd?: number,
    withBalance?: boolean,
  ): Promise<TransactionOnchainEntity[]> {
    const startBlock = blockHeightStart ?? (await this.getNextBlock());
    return this.saveOnchainTransactions(startBlock, blockHeightEnd, withBalance);
  }

  private async getNextBlock(): Promise<number> {
    const maxBlock = await this.transactionOnchainRepo.getMaxBlock();
    return maxBlock ? maxBlock + 1 : 0;
  }

  private async saveOnchainTransactions(
    blockHeightStart: number,
    blockHeightEnd?: number,
    withBalance = false,
  ): Promise<TransactionOnchainEntity[]> {
    if (blockHeightEnd !== undefined && blockHeightEnd < blockHeightStart)
      throw new Error('end block before start block');

    const transactionEntities = (
      await this.client
        .getOnchainTransactions(blockHeightStart, blockHeightEnd)
        .then((ot) => ot.map((ot) => this.createTransactionOnchainEntity(ot)))
    ).reverse();

    if (withBalance && transactionEntities.length > 0) {
      transactionEntities[transactionEntities.length - 1].balance = await this.client.getLndConfirmedWalletBalance();
    }

    return (
      await Util.doInBatches(
        transactionEntities,
        async (batch: TransactionOnchainEntity[]) =>
          Promise.all(batch.map((ref) => this.doUpdateOnchainTransaction(ref))),
        100,
      )
    ).flat();
  }

  async syncLightningTransactions(
    startDate?: Date,
    endDate?: Date,
    withBalance?: boolean,
  ): Promise<TransactionLightningEntity[]> {
    if (!startDate) {
      const transactionLightningEntities = await this.transactionLightningRepo.getEntriesWithMaxCreationTimestamp();

      if (transactionLightningEntities.length) {
        startDate = transactionLightningEntities[0].creationTimestamp;
      }
    }

    return this.saveLightningTransactions(startDate ?? new Date(0), endDate, withBalance);
  }

  private async saveLightningTransactions(
    creationDateStart: Date,
    creationDateEnd?: Date,
    withBalance?: boolean,
  ): Promise<TransactionLightningEntity[]> {
    if (creationDateEnd) {
      const timeDiff = Util.secondsDiff(creationDateStart, creationDateEnd);

      if (timeDiff < 0) throw new Error('end date before start date');
      if (!timeDiff) creationDateEnd = Util.secondsAfter(1, creationDateEnd);
    }

    const invoices = await this.getLightningTransactions(
      (max, offset, timeStart, timeEnd) => this.client.getInvoices(max, offset, timeStart, timeEnd),
      creationDateStart,
      creationDateEnd,
    );

    const payments = await this.getLightningTransactions(
      (max, offset, timeStart, timeEnd) => this.client.getPayments(max, offset, timeStart, timeEnd),
      creationDateStart,
      creationDateEnd,
    );

    const routings = await this.getLightningTransactions(
      (max, offset, timeStart, timeEnd) => this.client.getRoutings(max, offset, timeStart, timeEnd),
      creationDateStart,
      creationDateEnd,
    );

    const transactionEntities: TransactionLightningEntity[] = [];

    transactionEntities.push(...this.createTransactionLightningEntities(TransactionLightningType.INVOICE, invoices));
    transactionEntities.push(...this.createTransactionLightningEntities(TransactionLightningType.PAYMENT, payments));
    transactionEntities.push(...this.createTransactionLightningEntities(TransactionLightningType.ROUTING, routings));

    transactionEntities.sort(
      (t1, t2) => t1.creationTimestamp.getTime() - t2.creationTimestamp.getTime() || (t1.amount > t2.amount ? -1 : 1),
    );

    if (withBalance) {
      const balanceTransactionEntities = transactionEntities.filter((t) =>
        [TransactionLightningState.SETTLED, TransactionLightningState.SUCCEEDED].includes(t.state),
      );

      if (balanceTransactionEntities.length > 0) {
        balanceTransactionEntities[balanceTransactionEntities.length - 1].balance =
          await this.client.getLndLightningBalance();
      }
    }

    return (
      await Util.doInBatches(
        transactionEntities,
        async (batch: TransactionLightningEntity[]) =>
          Promise.all(batch.map((ref) => this.doUpdateLightningTransaction(ref))),
        100,
      )
    ).flat();
  }

  private async getLightningTransactions(
    action: (
      maxTransactions: number,
      offset: number,
      startDate: Date,
      endDate?: Date,
    ) => Promise<LndTransactionResponseDto>,
    startDate: Date,
    endDate?: Date,
  ): Promise<LndTransactionDto[]> {
    const maxTransactions = 100;
    const maxLoop = 100;

    let offset = 0;

    const allTransactions: LndTransactionDto[] = [];

    for (let i = 0; i < maxLoop; i++) {
      const transactionsResponse = await action(maxTransactions, offset, startDate, endDate);
      const transactions = transactionsResponse.transactions;
      allTransactions.push(...transactions);

      if (transactions.length < maxTransactions) {
        break;
      }

      offset = transactionsResponse.last_index_offset;
    }

    if (allTransactions.length === maxTransactions * maxLoop) {
      throw new Error('possibly further transactions available');
    }

    return allTransactions;
  }

  private handleOnchainTransactionMessage(onchainTransaction: LndOnchainTransactionDto): void {
    this.onchainTransactionMessageQueue
      .handle<void>(async () => this.updateOnchainTransaction(onchainTransaction))
      .catch((e) => {
        this.logger.error('Error while updating onchain transaction', e);
      });
  }

  private async updateOnchainTransaction(onchainTransaction: LndOnchainTransactionDto): Promise<void> {
    const updateOnchainTransactionEntity = this.createTransactionOnchainEntity(onchainTransaction);

    if (0 !== updateOnchainTransactionEntity.block) {
      updateOnchainTransactionEntity.balance = await this.client.getLndConfirmedWalletBalance();
    }

    await this.doUpdateOnchainTransaction(updateOnchainTransactionEntity);
  }

  private createTransactionOnchainEntity(onchainTransaction: LndOnchainTransactionDto): TransactionOnchainEntity {
    return this.transactionOnchainRepo.create({
      transaction: onchainTransaction.tx_hash,
      amount: Number(onchainTransaction.amount),
      fee: Number(onchainTransaction.total_fees),
      block: onchainTransaction.block_height,
      timestamp: new Date(Number(onchainTransaction.time_stamp) * 1000),
    });
  }

  private async doUpdateOnchainTransaction(
    updateOnchainTransactionEntity: TransactionOnchainEntity,
  ): Promise<TransactionOnchainEntity> {
    let dbOnchainTransactionEntity = await this.transactionOnchainRepo.findOneBy({
      transaction: updateOnchainTransactionEntity.transaction,
    });

    if (!dbOnchainTransactionEntity) {
      dbOnchainTransactionEntity = updateOnchainTransactionEntity;
    } else {
      Object.assign(dbOnchainTransactionEntity, updateOnchainTransactionEntity);
    }

    return this.transactionOnchainRepo.save(dbOnchainTransactionEntity);
  }

  private handleInvoiceTransactionMessage(invoice: LndTransactionDto): void {
    this.invoiceTransactionMessageQueue
      .handle<void>(async () => this.updateInvoice(invoice))
      .catch((e) => {
        this.logger.error('Error while updating invoice', e);
      });
  }

  private async updateInvoice(lndTransaction: LndTransactionDto): Promise<void> {
    return this.updateLightningTransaction(TransactionLightningType.INVOICE, lndTransaction);
  }

  private handlePaymentTransactionMessage(payment: LndTransactionDto): void {
    this.paymentTransactionMessageQueue
      .handle<void>(async () => this.updatePayment(payment))
      .catch((e) => {
        this.logger.error('Error while updating payment', e);
      });
  }

  private async updatePayment(lndTransaction: LndTransactionDto): Promise<void> {
    return this.updateLightningTransaction(TransactionLightningType.PAYMENT, lndTransaction);
  }

  private async updateLightningTransaction(
    transactionType: TransactionLightningType,
    lndTransaction: LndTransactionDto,
  ): Promise<void> {
    const updateTransactionEntity = this.createTransactionLightningEntity(transactionType, lndTransaction);

    if (
      [TransactionLightningState.SETTLED, TransactionLightningState.SUCCEEDED].includes(updateTransactionEntity.state)
    ) {
      updateTransactionEntity.balance = await this.client.getLndLightningBalance();
    }

    await this.doUpdateLightningTransaction(updateTransactionEntity);
  }

  private createTransactionLightningEntities(
    type: TransactionLightningType,
    transactions: LndTransactionDto[],
  ): TransactionLightningEntity[] {
    return transactions.map((t) => {
      return this.createTransactionLightningEntity(type, t);
    });
  }

  private createTransactionLightningEntity(
    type: TransactionLightningType,
    transaction: LndTransactionDto,
  ): TransactionLightningEntity {
    const state = <TransactionLightningState>TransactionLightningState[transaction.state];
    if (!state) throw new NotFoundException(`${type}: Unknown transaction state ${transaction.state}`);

    const paymentRequest = transaction.paymentRequest;
    const invoiceInfo = paymentRequest ? LightningHelper.getInvoiceInfo(paymentRequest) : undefined;

    const description = transaction.description ?? invoiceInfo?.description;
    const publicKey = invoiceInfo?.publicKey;

    return this.transactionLightningRepo.create({
      type: type,
      state: state,
      transaction: transaction.transaction,
      secret: transaction.secret,
      publicKey: publicKey,
      amount: transaction.amount,
      fee: transaction.fee,
      creationTimestamp: transaction.creationTimestamp,
      expiresTimestamp: transaction.expiresTimestamp,
      confirmedTimestamp: transaction.confirmedTimestamp,
      description: description,
      reason: transaction.reason,
      paymentRequest: paymentRequest,
    });
  }

  private async doUpdateLightningTransaction(
    updateTransactionLightningEntity: TransactionLightningEntity,
  ): Promise<TransactionLightningEntity> {
    let dbTransactionLightningEntity = await this.transactionLightningRepo.findOneBy({
      type: updateTransactionLightningEntity.type,
      transaction: updateTransactionLightningEntity.transaction,
    });

    if (!dbTransactionLightningEntity) {
      dbTransactionLightningEntity = updateTransactionLightningEntity;
    } else {
      Object.assign(dbTransactionLightningEntity, updateTransactionLightningEntity);
    }

    return this.transactionLightningRepo.save(dbTransactionLightningEntity);
  }
}
