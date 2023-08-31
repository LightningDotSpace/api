const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class Initial1693381371362 {
  name = 'Initial1693381371362';

  async up(queryRunner) {
    await queryRunner.query(
      `CREATE TABLE "user" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_8ce4c93ba419b56bd82e533724d" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_5904a9d40152f354e4c7b0202fb" DEFAULT getdate(), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "wallet_provider" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_84c9dbd2dd0e662567cb7316479" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_8cb5099f91fbd28ae877b04aa74" DEFAULT getdate(), "name" nvarchar(255) NOT NULL, CONSTRAINT "UQ_1e7a695e2f2ea4ca54df5f0fc72" UNIQUE ("name"), CONSTRAINT "PK_5c7933595d00e530f9d0eecca81" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "wallet" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_2f026f6cfde1264d133a9da4a40" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_fb09ba370efe59a077ccb666826" DEFAULT getdate(), "address" nvarchar(255) NOT NULL, "signature" nvarchar(255) NOT NULL, "lnbitsUserId" nvarchar(255) NOT NULL, "lnbitsAddress" nvarchar(255) NOT NULL, "role" nvarchar(255) NOT NULL CONSTRAINT "DF_39dba1739ead1346b5eef893188" DEFAULT 'User', "walletProviderId" int NOT NULL, "userId" int NOT NULL, CONSTRAINT "UQ_1dcc9f5fd49e3dc52c6d2393c53" UNIQUE ("address"), CONSTRAINT "UQ_55b77268e1ab3d6caba35c2e1f7" UNIQUE ("lnbitsUserId"), CONSTRAINT "UQ_a380084e2f3e0213d45ce414129" UNIQUE ("lnbitsAddress"), CONSTRAINT "PK_bec464dd8d54c39c54fd32e2334" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lightning_wallet" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_2a2a8f12dffb71a971554a4e5da" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_433f721ae8922b747c42ca5d6f5" DEFAULT getdate(), "lnbitsWalletId" nvarchar(255) NOT NULL, "asset" nvarchar(255) NOT NULL, "adminKey" nvarchar(255) NOT NULL, "invoiceKey" nvarchar(255) NOT NULL, "lnurlpId" nvarchar(255) NOT NULL, "walletId" int NOT NULL, CONSTRAINT "UQ_60f18254b76b69d24553d8c0562" UNIQUE ("lnbitsWalletId"), CONSTRAINT "PK_ea0c4797a4f0f6d0b9979e8a432" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet" ADD CONSTRAINT "FK_5f9d93bd5c22ed5b4211b26718a" FOREIGN KEY ("walletProviderId") REFERENCES "wallet_provider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet" ADD CONSTRAINT "FK_35472b1fe48b6330cd349709564" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lightning_wallet" ADD CONSTRAINT "FK_ebc8d061296752d702c459dfc20" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "lightning_wallet" DROP CONSTRAINT "FK_ebc8d061296752d702c459dfc20"`);
    await queryRunner.query(`ALTER TABLE "wallet" DROP CONSTRAINT "FK_35472b1fe48b6330cd349709564"`);
    await queryRunner.query(`ALTER TABLE "wallet" DROP CONSTRAINT "FK_5f9d93bd5c22ed5b4211b26718a"`);
    await queryRunner.query(`DROP TABLE "lightning_wallet"`);
    await queryRunner.query(`DROP TABLE "wallet"`);
    await queryRunner.query(`DROP TABLE "wallet_provider"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
};
