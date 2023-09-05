const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class addAsset1693922883477 {
    name = 'addAsset1693922883477'

    async up(queryRunner) {
        await queryRunner.query(`EXEC sp_rename "lightning_wallet.asset", "assetId"`);
        await queryRunner.query(`CREATE TABLE "dbo"."asset" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_3ee68e53a3e33a8df283f66aada" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_6ed5cbbccf21b8ef558f7ef2de5" DEFAULT getdate(), "name" nvarchar(256) NOT NULL, "displayName" nvarchar(256) NOT NULL, "description" nvarchar(256), "status" nvarchar(256) NOT NULL, CONSTRAINT "PK_1209d107fe21482beaea51b745e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "dbo"."wallet" ADD "addressOwnershipProof" nvarchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "dbo"."wallet" ADD CONSTRAINT "UQ_e27ddf84aefa72d600acbf393c5" UNIQUE ("addressOwnershipProof")`);
        await queryRunner.query(`ALTER TABLE "dbo"."lightning_wallet" DROP COLUMN "assetId"`);
        await queryRunner.query(`ALTER TABLE "dbo"."lightning_wallet" ADD "assetId" int NOT NULL`);
        await queryRunner.query(`ALTER TABLE "dbo"."lightning_wallet" ADD CONSTRAINT "FK_37f046b3cbbb273f24a4badd1f7" FOREIGN KEY ("assetId") REFERENCES "dbo"."asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "dbo"."lightning_wallet" DROP CONSTRAINT "FK_37f046b3cbbb273f24a4badd1f7"`);
        await queryRunner.query(`ALTER TABLE "dbo"."lightning_wallet" DROP COLUMN "assetId"`);
        await queryRunner.query(`ALTER TABLE "dbo"."lightning_wallet" ADD "assetId" nvarchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "dbo"."wallet" DROP CONSTRAINT "UQ_e27ddf84aefa72d600acbf393c5"`);
        await queryRunner.query(`ALTER TABLE "dbo"."wallet" DROP COLUMN "addressOwnershipProof"`);
        await queryRunner.query(`DROP TABLE ."asset"`);
        await queryRunner.query(`EXEC sp_rename "lightning_wallet.assetId", "asset"`);
    }
}
