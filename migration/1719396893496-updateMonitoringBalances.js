const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class updateMonitoringBalances1719396893496 {
    name = 'updateMonitoringBalances1719396893496'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "monitoring_balance" ADD "assetPriceInCHF" float NOT NULL CONSTRAINT "DF_62ed605d744743030504b978fa4" DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" ADD "ldsBalance" float NOT NULL CONSTRAINT "DF_cfd5f092c873462ca702ff28443" DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" ADD "ldsBalanceInCHF" float NOT NULL CONSTRAINT "DF_31e1791294be6327ebe4bf966b6" DEFAULT 0`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP CONSTRAINT "DF_31e1791294be6327ebe4bf966b6"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP COLUMN "ldsBalanceInCHF"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP CONSTRAINT "DF_cfd5f092c873462ca702ff28443"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP COLUMN "ldsBalance"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP CONSTRAINT "DF_62ed605d744743030504b978fa4"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP COLUMN "assetPriceInCHF"`);
    }
}
