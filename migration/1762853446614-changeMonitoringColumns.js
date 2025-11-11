const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class changeMonitoringColumns1762853446614 {
    name = 'changeMonitoringColumns1762853446614'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "monitoring_balance" ADD CONSTRAINT "DF_ac1ee3f6ceaef62d8d4e65da464" DEFAULT 0 FOR "lightningBalance"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" ADD CONSTRAINT "DF_d27d96a891edbe6d94e98c78595" DEFAULT 0 FOR "customerBalance"`);

        await queryRunner.query(`ALTER TABLE "monitoring_balance" ADD "rootstockBalance" float NOT NULL CONSTRAINT "DF_e6e6c92e451a1c8873820c88148" DEFAULT 0`);

        await queryRunner.query(`EXEC sp_rename "monitoring_balance.onchainBalance", "lndOnchainBalance"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" ADD CONSTRAINT "DF_15b16bea0993decd0e402674a70" DEFAULT 0 FOR "lndOnchainBalance"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" ADD "onchainBalance" float NOT NULL CONSTRAINT "DF_2330d3f328361a24c345faf198a" DEFAULT 0`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP CONSTRAINT "DF_2330d3f328361a24c345faf198a"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP COLUMN "onchainBalance"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP CONSTRAINT "DF_15b16bea0993decd0e402674a70"`);
        await queryRunner.query(`EXEC sp_rename "monitoring_balance.lndOnchainBalance", "onchainBalance"`);

        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP CONSTRAINT "DF_e6e6c92e451a1c8873820c88148"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP COLUMN "rootstockBalance"`);

        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP CONSTRAINT "DF_d27d96a891edbe6d94e98c78595"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP CONSTRAINT "DF_ac1ee3f6ceaef62d8d4e65da464"`);
    }
}
