const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class updateMonitoringBalances1719396893496 {
    name = 'updateMonitoringBalances1719396893496'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "monitoring_balance" ADD "assetCHF" float NOT NULL CONSTRAINT "DF_3489d8415efeb97ef4d4e4d21ba" DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" ADD "ldsBalance" float NOT NULL CONSTRAINT "DF_cfd5f092c873462ca702ff28443" DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" ADD "ldsBalanceCHF" float NOT NULL CONSTRAINT "DF_f71c27b2ef35d455c68a8f44d07" DEFAULT 0`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP CONSTRAINT "DF_f71c27b2ef35d455c68a8f44d07"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP COLUMN "ldsBalanceCHF"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP CONSTRAINT "DF_cfd5f092c873462ca702ff28443"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP COLUMN "ldsBalance"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP CONSTRAINT "DF_3489d8415efeb97ef4d4e4d21ba"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP COLUMN "assetCHF"`);
    }
}
