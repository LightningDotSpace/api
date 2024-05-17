const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class setupMonitoring1715957540871 {
    name = 'setupMonitoring1715957540871'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "monitoring_balance" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_1924e81cee5a97b75d44d2bc4b5" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_c23448ffc708ab18d7e105d7d1c" DEFAULT getdate(), "onchainBalance" float NOT NULL, "lightningBalance" float NOT NULL, "customerBalance" float NOT NULL, "assetId" int, CONSTRAINT "PK_7b5964e6f913159bfdbd4604087" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "monitoring" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_86d36f61c6bc24957a4c25688db" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_3b53d0f951dd09113dfcd3ef87b" DEFAULT getdate(), "type" nvarchar(255) NOT NULL, "name" nvarchar(255) NOT NULL, "value" nvarchar(255) NOT NULL, CONSTRAINT "PK_22a9f9562020245a98bd2c4fb3c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c132236516bf54a888017a59ac" ON "monitoring" ("type", "name") `);
        await queryRunner.query(`ALTER TABLE "monitoring_balance" ADD CONSTRAINT "FK_6e507ef4194b68b0ca0ff02023e" FOREIGN KEY ("assetId") REFERENCES "asset_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "monitoring_balance" DROP CONSTRAINT "FK_6e507ef4194b68b0ca0ff02023e"`);
        await queryRunner.query(`DROP INDEX "IDX_c132236516bf54a888017a59ac" ON "monitoring"`);
        await queryRunner.query(`DROP TABLE "monitoring"`);
        await queryRunner.query(`DROP TABLE "monitoring_balance"`);
    }
}
