/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

/**
 * @class
 * @implements {MigrationInterface}
 */
module.exports = class CreateMonitoringEvmBalance1770363785003 {
    name = 'CreateMonitoringEvmBalance1770363785003'

    /**
     * @param {QueryRunner} queryRunner
     */
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "monitoring_evm_balance" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_a12be90866896c9f2bfca372813" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_58ba0fc2da4061d234fac997dbb" DEFAULT getdate(), "blockchain" varchar(50) NOT NULL, "nativeSymbol" varchar(10) NOT NULL, "nativeBalance" float NOT NULL CONSTRAINT "DF_3223bf469c487599a6954599f5c" DEFAULT 0, "tokenBalances" nvarchar(max), CONSTRAINT "PK_9e27ea97b0eb8872a956abd8e2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_708ecfcf63cd709863b65da2e1" ON "monitoring_evm_balance" ("blockchain") `);
    }

    /**
     * @param {QueryRunner} queryRunner
     */
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "IDX_708ecfcf63cd709863b65da2e1" ON "monitoring_evm_balance"`);
        await queryRunner.query(`DROP TABLE "monitoring_evm_balance"`);
    }
}
