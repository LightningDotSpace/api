const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class removeRootstockBalance1769698161000 {
    name = 'removeRootstockBalance1769698161000'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP CONSTRAINT "DF_e6e6c92e451a1c8873820c88148"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP COLUMN "rootstockBalance"`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "monitoring_balance" ADD "rootstockBalance" float NOT NULL CONSTRAINT "DF_e6e6c92e451a1c8873820c88148" DEFAULT 0`);
    }
}
