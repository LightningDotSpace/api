const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class setupMonitoring1715866807769 {
    name = 'setupMonitoring1715866807769'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "monitoring_balance" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_1924e81cee5a97b75d44d2bc4b5" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_c23448ffc708ab18d7e105d7d1c" DEFAULT getdate(), "onchainBalance" float NOT NULL, "lightningBalance" float NOT NULL, "customerBalance" float NOT NULL, "assetId" int, CONSTRAINT "PK_7b5964e6f913159bfdbd4604087" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" ADD CONSTRAINT "FK_6e507ef4194b68b0ca0ff02023e" FOREIGN KEY ("assetId") REFERENCES "asset_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP CONSTRAINT "FK_6e507ef4194b68b0ca0ff02023e"`);
        await queryRunner.query(`DROP TABLE "monitoring_balance"`);
    }
}
