const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class setupFrankencoinPay1715583133193 {
    name = 'setupFrankencoinPay1715583133193'

    async up(queryRunner) {
        await queryRunner.query(`EXEC sp_rename "dbo"."asset", "dbo"."asset_account"`);
        await queryRunner.query(`ALTER TABLE "dbo"."asset_account" ADD "symbol" nvarchar(255)`);
        await queryRunner.query(`ALTER TABLE "dbo"."asset_account" ADD "minSendable" smallint`);
        await queryRunner.query(`ALTER TABLE "dbo"."asset_account" ADD "maxSendable" bigint`);
        await queryRunner.query(`ALTER TABLE "dbo"."asset_account" ADD "decimals" smallint`);

        //await queryRunner.query(`ALTER TABLE "dbo"."lightning_wallet" DROP CONSTRAINT "FK_37f046b3cbbb273f24a4badd1f7"`);
        await queryRunner.query(`CREATE TABLE "dbo"."asset_transfer" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_9c317475a5040ff9d7d6b8b94af" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_7726f135d70ef32fd500641f087" DEFAULT getdate(), "name" nvarchar(255) NOT NULL, "displayName" nvarchar(255) NOT NULL, "status" nvarchar(255) NOT NULL, "blockchain" nvarchar(255) NOT NULL, "address" nvarchar(255), CONSTRAINT "PK_d6055020b87303085fec8d88f5f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c364ba178533de8c281fe34b64" ON "dbo"."asset_transfer" ("name", "blockchain") `);
        //await queryRunner.query(`CREATE TABLE "dbo"."asset_account" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_79c1ed6df1299255104286d42f3" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_74dabc234729db87e4226e1dd11" DEFAULT getdate(), "name" nvarchar(255) NOT NULL, "displayName" nvarchar(255) NOT NULL, "status" nvarchar(255) NOT NULL, "symbol" nvarchar(255), "minSendable" smallint, "maxSendable" bigint, "decimals" smallint, CONSTRAINT "UQ_67e1e1b5666324e4ba18e5dd272" UNIQUE ("name"), CONSTRAINT "PK_0329f83a1954129b138e177d238" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "dbo"."payment_request" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_6e79eceef62060c7a1e0e2e2eaa" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_6fa00396d32e31c39e894ae33b1" DEFAULT getdate(), "state" nvarchar(255) NOT NULL, "invoiceAmount" float NOT NULL, "transferAmount" float NOT NULL, "paymentRequest" nvarchar(MAX) NOT NULL, "expiryDate" datetime NOT NULL, "paymentMethod" nvarchar(255) NOT NULL, "errorMessage" nvarchar(MAX), "invoiceAssetId" int, "transferAssetId" int, "lightningWalletId" int, CONSTRAINT "PK_b274a8e7b35dd0fd12e46e89f3c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "dbo"."transaction_evm" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_daf4fd3557a6e29344b11a5bab3" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_49e1d6530fda736ed4903e5ce77" DEFAULT getdate(), "state" nvarchar(255) NOT NULL, "amount" float NOT NULL, "transaction" nvarchar(255) NOT NULL, "errorMessage" nvarchar(MAX), "assetId" int, CONSTRAINT "PK_da8f5f87acf951be71790cbf71e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "dbo"."user_transaction" ADD "evmTransactionId" int`);
        await queryRunner.query(`ALTER TABLE "dbo"."user_transaction" ADD "paymentRequestId" int`);
        await queryRunner.query(`ALTER TABLE "dbo"."user_transaction" DROP CONSTRAINT "FK_b2a00eab28ff6b7052c4eee695f"`);
        await queryRunner.query(`ALTER TABLE "dbo"."user_transaction" ALTER COLUMN "lightningTransactionId" int`);
        await queryRunner.query(`CREATE UNIQUE INDEX "REL_5321f899f7b93e29184aca2e76" ON "dbo"."user_transaction" ("evmTransactionId") WHERE "evmTransactionId" IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "REL_c5c971bdda1132ff33afab0f3d" ON "dbo"."user_transaction" ("paymentRequestId") WHERE "paymentRequestId" IS NOT NULL`);
        //await queryRunner.query(`ALTER TABLE "dbo"."lightning_wallet" ADD CONSTRAINT "FK_37f046b3cbbb273f24a4badd1f7" FOREIGN KEY ("assetId") REFERENCES "dbo"."asset_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."payment_request" ADD CONSTRAINT "FK_653ab346cbd9f7297e2bff279fa" FOREIGN KEY ("invoiceAssetId") REFERENCES "dbo"."asset_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."payment_request" ADD CONSTRAINT "FK_7d73326cc4a41f52df8e1924903" FOREIGN KEY ("transferAssetId") REFERENCES "dbo"."asset_transfer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."payment_request" ADD CONSTRAINT "FK_cd377dc658d6351cff4526ceb7f" FOREIGN KEY ("lightningWalletId") REFERENCES "dbo"."lightning_wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."user_transaction" ADD CONSTRAINT "FK_b2a00eab28ff6b7052c4eee695f" FOREIGN KEY ("lightningTransactionId") REFERENCES "dbo"."transaction_lightning"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."user_transaction" ADD CONSTRAINT "FK_5321f899f7b93e29184aca2e760" FOREIGN KEY ("evmTransactionId") REFERENCES "dbo"."transaction_evm"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."user_transaction" ADD CONSTRAINT "FK_c5c971bdda1132ff33afab0f3d9" FOREIGN KEY ("paymentRequestId") REFERENCES "dbo"."payment_request"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."transaction_evm" ADD CONSTRAINT "FK_a1b5c600668f6899efd03961f30" FOREIGN KEY ("assetId") REFERENCES "dbo"."asset_transfer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`UPDATE "dbo"."asset_account" SET "status" = 'active' WHERE "status" = 'Active'`);
        await queryRunner.query(`UPDATE "dbo"."asset_account" SET "status" = 'inactive' WHERE "status" = 'ComingSoon'`);

        await queryRunner.query(`UPDATE "dbo"."asset_account" SET "symbol" = 'B', "minSendable" = 1, "maxSendable" = 100000000, "decimals" = 8 WHERE "name" = 'BTC'`);
        await queryRunner.query(`UPDATE "dbo"."asset_account" SET "symbol" = '$', "minSendable" = 1, "maxSendable" = 1000000, "decimals" = 2 WHERE "name" = 'USD'`);
        await queryRunner.query(`UPDATE "dbo"."asset_account" SET "symbol" = '₣', "minSendable" = 1, "maxSendable" = 1000000, "decimals" = 2 WHERE "name" = 'CHF'`);
        await queryRunner.query(`UPDATE "dbo"."asset_account" SET "symbol" = '€', "minSendable" = 1, "maxSendable" = 1000000, "decimals" = 2 WHERE "name" = 'EUR'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "dbo"."transaction_evm" DROP CONSTRAINT "FK_a1b5c600668f6899efd03961f30"`);
        await queryRunner.query(`ALTER TABLE "dbo"."user_transaction" DROP CONSTRAINT "FK_c5c971bdda1132ff33afab0f3d9"`);
        await queryRunner.query(`ALTER TABLE "dbo"."user_transaction" DROP CONSTRAINT "FK_5321f899f7b93e29184aca2e760"`);
        await queryRunner.query(`ALTER TABLE "dbo"."user_transaction" DROP CONSTRAINT "FK_b2a00eab28ff6b7052c4eee695f"`);
        await queryRunner.query(`ALTER TABLE "dbo"."payment_request" DROP CONSTRAINT "FK_cd377dc658d6351cff4526ceb7f"`);
        await queryRunner.query(`ALTER TABLE "dbo"."payment_request" DROP CONSTRAINT "FK_7d73326cc4a41f52df8e1924903"`);
        await queryRunner.query(`ALTER TABLE "dbo"."payment_request" DROP CONSTRAINT "FK_653ab346cbd9f7297e2bff279fa"`);
        //await queryRunner.query(`ALTER TABLE "dbo"."lightning_wallet" DROP CONSTRAINT "FK_37f046b3cbbb273f24a4badd1f7"`);
        await queryRunner.query(`DROP INDEX "REL_c5c971bdda1132ff33afab0f3d" ON "dbo"."user_transaction"`);
        await queryRunner.query(`DROP INDEX "REL_5321f899f7b93e29184aca2e76" ON "dbo"."user_transaction"`);
        await queryRunner.query(`ALTER TABLE "dbo"."user_transaction" ALTER COLUMN "lightningTransactionId" int NOT NULL`);
        await queryRunner.query(`ALTER TABLE "dbo"."user_transaction" ADD CONSTRAINT "FK_b2a00eab28ff6b7052c4eee695f" FOREIGN KEY ("lightningTransactionId") REFERENCES "dbo"."transaction_lightning"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."user_transaction" DROP COLUMN "paymentRequestId"`);
        await queryRunner.query(`ALTER TABLE "dbo"."user_transaction" DROP COLUMN "evmTransactionId"`);
        await queryRunner.query(`DROP TABLE "dbo"."transaction_evm"`);
        await queryRunner.query(`DROP TABLE "dbo"."payment_request"`);
        //await queryRunner.query(`DROP TABLE "dbo"."asset_account"`);
        await queryRunner.query(`DROP INDEX "IDX_c364ba178533de8c281fe34b64" ON "dbo"."asset_transfer"`);
        await queryRunner.query(`DROP TABLE "dbo"."asset_transfer"`);
        //await queryRunner.query(`ALTER TABLE "dbo"."lightning_wallet" ADD CONSTRAINT "FK_37f046b3cbbb273f24a4badd1f7" FOREIGN KEY ("assetId") REFERENCES "dbo"."asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`EXEC sp_rename "dbo"."asset_account", "dbo"."asset"`);

        await queryRunner.query(`UPDATE "dbo"."asset" SET "status" = 'Active' WHERE "status" = 'active'`);
        await queryRunner.query(`UPDATE "dbo"."asset" SET "status" = 'ComingSoon' WHERE "status" = 'inactive'`);

        await queryRunner.query(`ALTER TABLE "dbo"."asset" DROP COLUMN "symbol"`);
        await queryRunner.query(`ALTER TABLE "dbo"."asset" DROP COLUMN "minSendable"`);
        await queryRunner.query(`ALTER TABLE "dbo"."asset" DROP COLUMN "maxSendable"`);
        await queryRunner.query(`ALTER TABLE "dbo"."asset" DROP COLUMN "decimals"`);
    }
}
