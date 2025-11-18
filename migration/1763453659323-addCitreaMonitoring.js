const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class addCitreaMonitoring1763453659323 {
    name = 'addCitreaMonitoring1763453659323'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "monitoring_balance" ADD "citreaBalance" float NOT NULL CONSTRAINT "DF_98f1eabfa79a178eacdc47fe777" DEFAULT 0`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP CONSTRAINT "DF_98f1eabfa79a178eacdc47fe777"`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP COLUMN "citreaBalance"`);
    }
}
