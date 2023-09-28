import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { LnBitsUsermanagerWalletDto } from 'src/integration/blockchain/lightning/dto/lnbits.dto';
import {
  LndOnchainTransactionDto,
  LndTransactionDto,
  LndTransactionResponseDto,
} from 'src/integration/blockchain/lightning/dto/lnd.dto';
import { LightningHelper } from 'src/integration/blockchain/lightning/lightning-helper';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { Lock } from 'src/shared/utils/lock';
import { LightingWalletRepository } from 'src/subdomains/user/application/repositories/lightning-wallet.repository';
import { LessThan } from 'typeorm';
import { LightningClient } from '../../../integration/blockchain/lightning/lightning-client';
import {
  TransactionLightningEntity,
  TransactionLightningState,
  TransactionLightningType,
} from '../entities/transaction-lightning.entity';
import { TransactionOnchainEntity } from '../entities/transaction-onchain.entity';
import { UserTransactionEntity, UserTransactionType } from '../entities/user-transaction.entity';
import { TransactionLightningRepository } from '../repositories/transaction-lightning.repository';
import { TransactionOnchainRepository } from '../repositories/transaction-onchain.repository';
import { UserTransactionRepository } from '../repositories/user-transaction.repository';

@Injectable()
export class LightningTransactionService {
  private readonly logger = new LightningLogger(LightningTransactionService);

  private readonly client: LightningClient;

  constructor(
    lightningService: LightningService,
    private readonly transactionOnchainRepo: TransactionOnchainRepository,
    private readonly transactionLightningRepo: TransactionLightningRepository,
    private readonly userTransactionRepository: UserTransactionRepository,
    private readonly lightingWalletRepository: LightingWalletRepository,
  ) {
    this.client = lightningService.getDefaultClient();
  }

  @Cron(CronExpression.EVERY_HOUR)
  @Lock()
  async updateOpenInvoices(): Promise<void> {
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
      this.logger.error('Error while updating invoices', e);
    }
  }

  async syncOnchainTransactions(): Promise<TransactionOnchainEntity[]> {
    const maxBlock = (await this.transactionOnchainRepo.getMaxBlock()) ?? -1;
    return this.saveOnchainTransactions(maxBlock + 1);
  }

  private async saveOnchainTransactions(startBlockHeight: number): Promise<TransactionOnchainEntity[]> {
    const newTransactionEntities: TransactionOnchainEntity[] = [];

    const onchainTransactions = (await this.client.getOnchainTransactions(startBlockHeight)).reverse();

    for (const onchainTransaction of onchainTransactions) {
      const transactionEntity = this.mapOnchainTransaction(onchainTransaction);
      newTransactionEntities.push(transactionEntity);
    }

    if (newTransactionEntities.length > 0) {
      newTransactionEntities[newTransactionEntities.length - 1].balance =
        await this.client.getLndConfirmedWalletBalance();
    }

    return this.transactionOnchainRepo.saveMany(newTransactionEntities);
  }

  private mapOnchainTransaction(onchainTransaction: LndOnchainTransactionDto): TransactionOnchainEntity {
    return this.transactionOnchainRepo.create({
      transaction: onchainTransaction.tx_hash,
      amount: Number(onchainTransaction.amount),
      fee: Number(onchainTransaction.total_fees),
      block: onchainTransaction.block_height,
      timestamp: new Date(Number(onchainTransaction.time_stamp) * 1000),
    });
  }

  async syncLightningTransactions(): Promise<TransactionLightningEntity[]> {
    const databaseTransactionEntities = await this.transactionLightningRepo.getEntriesWithMaxCreationTimestamp();

    if (0 === databaseTransactionEntities.length) {
      return this.saveLightningTransactions();
    }

    return this.saveLightningTransactions(databaseTransactionEntities);
  }

  private async saveLightningTransactions(
    databaseTransactionEntities?: TransactionLightningEntity[],
  ): Promise<TransactionLightningEntity[]> {
    const startDate = databaseTransactionEntities
      ? new Date(databaseTransactionEntities[0].creationTimestamp.getTime())
      : new Date(0);

    const invoices = await this.getLightningTransactions(
      (start, max, offset) => this.client.getInvoices(start, max, offset),
      startDate,
    );

    const payments = await this.getLightningTransactions(
      (start, max, offset) => this.client.getPayments(start, max, offset),
      startDate,
    );

    const routings = await this.getLightningTransactions(
      (start, max, offset) => this.client.getRoutings(start, max, offset),
      startDate,
    );

    const newTransactionEntities: TransactionLightningEntity[] = [];

    newTransactionEntities.push(
      ...this.mapLightningTransactions(TransactionLightningType.INVOICE, invoices, databaseTransactionEntities),
    );
    newTransactionEntities.push(
      ...this.mapLightningTransactions(TransactionLightningType.PAYMENT, payments, databaseTransactionEntities),
    );
    newTransactionEntities.push(
      ...this.mapLightningTransactions(TransactionLightningType.ROUTING, routings, databaseTransactionEntities),
    );

    newTransactionEntities.sort(
      (t1, t2) => t1.creationTimestamp.getTime() - t2.creationTimestamp.getTime() || (t1.amount > t2.amount ? -1 : 1),
    );

    const balanceTransactionEntities = newTransactionEntities.filter((t) =>
      [TransactionLightningState.SETTLED, TransactionLightningState.SUCCEEDED].includes(t.state),
    );

    if (balanceTransactionEntities.length > 0) {
      balanceTransactionEntities[balanceTransactionEntities.length - 1].balance =
        await this.client.getLndLightningBalance();
    }

    return this.transactionLightningRepo.saveMany(newTransactionEntities);
  }

  private async getLightningTransactions(
    action: (startDate: Date, maxTransactions: number, offset: number) => Promise<LndTransactionResponseDto>,
    startDate: Date,
    maxTransactions = 100,
    maxLoop = 100,
  ): Promise<LndTransactionDto[]> {
    let offset = 0;

    const allTransactions: LndTransactionDto[] = [];

    for (let i = 0; i < maxLoop; i++) {
      const transactionsResponse = await action(startDate, maxTransactions, offset);
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

  private mapLightningTransactions(
    type: TransactionLightningType,
    transactions: LndTransactionDto[],
    databaseTransactionEntities?: TransactionLightningEntity[],
  ): TransactionLightningEntity[] {
    const transactionEntities: TransactionLightningEntity[] = [];

    const databaseTransactions = databaseTransactionEntities?.map((t) => t.transaction);

    for (const transaction of transactions) {
      if (!databaseTransactions?.includes(transaction.transaction)) {
        const transactionEntity = this.mapLightningTransaction(type, transaction);
        transactionEntities.push(transactionEntity);
      }
    }

    return transactionEntities;
  }

  private mapLightningTransaction(
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

  async syncLightningUserTransactions(): Promise<UserTransactionEntity[]> {
    const databaseUserTransactionEntities = await this.userTransactionRepository.getEntriesWithMaxCreationTimestamp();

    if (0 === databaseUserTransactionEntities.length) {
      return this.saveLightningUserTransactions();
    }

    return this.saveLightningUserTransactions(databaseUserTransactionEntities);
  }

  private async saveLightningUserTransactions(
    databaseUserTransactionEntities?: UserTransactionEntity[],
  ): Promise<UserTransactionEntity[]> {
    const newUserTransactionEntities: UserTransactionEntity[] = [];

    const allUserWallets = await this.client.getUserWallets();

    const startDate = databaseUserTransactionEntities
      ? new Date(databaseUserTransactionEntities[0].creationTimestamp.getTime())
      : new Date(0);

    for (const wallet of allUserWallets) {
      const userTransactionEntities = await this.getUserWalletTransactions(startDate, wallet);
      newUserTransactionEntities.push(...userTransactionEntities);
    }

    newUserTransactionEntities.sort(
      (t1, t2) => t1.lightningTransaction.id - t2.lightningTransaction.id || (t1.amount > t2.amount ? -1 : 1),
    );

    return this.userTransactionRepository.saveMany(newUserTransactionEntities);
  }

  private async getUserWalletTransactions(
    startDate: Date,
    wallet: LnBitsUsermanagerWalletDto,
  ): Promise<UserTransactionEntity[]> {
    const userTransactionEntities: UserTransactionEntity[] = [];

    const lightningWalletEntity = await this.lightingWalletRepository.getByWalletId(wallet.id);

    const allUserWalletTransactions = await this.client.getUserWalletTransactions(wallet.id);
    const newUserWalletTransactions = allUserWalletTransactions.filter((t) => t.time > startDate.getTime());

    for (const userWalletTransaction of newUserWalletTransactions) {
      const lightningTransaction = await this.transactionLightningRepo.getByTransaction(
        userWalletTransaction.payment_hash,
      );

      const userTransactionEntity = this.userTransactionRepository.create({
        type: userWalletTransaction.checking_id.startsWith('internal')
          ? UserTransactionType.INTERN
          : UserTransactionType.EXTERN,
        amount: LightningHelper.msatToSat(userWalletTransaction.amount),
        fee: LightningHelper.msatToSat(userWalletTransaction.fee),
        creationTimestamp: new Date(userWalletTransaction.time * 1000),
        expiresTimestamp: new Date(userWalletTransaction.expiry * 1000),
        tag: userWalletTransaction.extra.tag,
        lightningWallet: lightningWalletEntity,
        lightningTransaction: lightningTransaction,
      });

      userTransactionEntities.push(userTransactionEntity);
    }

    if (userTransactionEntities.length > 0) {
      const lnbitsWallet = await this.client.getLnBitsWallet(wallet.adminkey);
      userTransactionEntities[userTransactionEntities.length - 1].balance = LightningHelper.btcToSat(
        lnbitsWallet.balance,
      );
    }

    return userTransactionEntities;
  }

  async updateOnchainTransaction(onchainTransaction: LndOnchainTransactionDto): Promise<void> {
    const updateOnchainTransactionEntity = this.mapOnchainTransaction(onchainTransaction);

    if (0 !== updateOnchainTransactionEntity.block) {
      updateOnchainTransactionEntity.balance = await this.client.getLndConfirmedWalletBalance();
    }

    const dbOnchainTransactionEntity = await this.transactionOnchainRepo.findOneBy({
      transaction: onchainTransaction.tx_hash,
    });

    if (!dbOnchainTransactionEntity) {
      await this.transactionOnchainRepo.save(updateOnchainTransactionEntity);
    } else {
      await this.transactionOnchainRepo.update(dbOnchainTransactionEntity.id, {
        amount: updateOnchainTransactionEntity.amount,
        fee: updateOnchainTransactionEntity.fee,
        balance: updateOnchainTransactionEntity.balance,
        block: updateOnchainTransactionEntity.block,
        timestamp: updateOnchainTransactionEntity.timestamp,
      });
    }
  }

  async updatePayment(lndTransaction: LndTransactionDto): Promise<void> {
    return this.updateTransaction(TransactionLightningType.PAYMENT, lndTransaction);
  }

  async updateInvoice(lndTransaction: LndTransactionDto): Promise<void> {
    return this.updateTransaction(TransactionLightningType.INVOICE, lndTransaction);
  }

  private async updateTransaction(
    transactionType: TransactionLightningType,
    lndTransaction: LndTransactionDto,
  ): Promise<void> {
    const updateTransactionEntity = this.mapLightningTransaction(transactionType, lndTransaction);

    if (
      [TransactionLightningState.SETTLED, TransactionLightningState.SUCCEEDED].includes(updateTransactionEntity.state)
    ) {
      updateTransactionEntity.balance = await this.client.getLndLightningBalance();
    }

    const dbTransactionEntity = await this.transactionLightningRepo.findOneBy({
      type: transactionType,
      transaction: lndTransaction.transaction,
    });

    if (!dbTransactionEntity) {
      await this.transactionLightningRepo.save(updateTransactionEntity);
    } else {
      await this.transactionLightningRepo.update(dbTransactionEntity.id, {
        balance: updateTransactionEntity.balance,
        state: updateTransactionEntity.state,
        reason: updateTransactionEntity.reason,
      });
    }
  }
}
