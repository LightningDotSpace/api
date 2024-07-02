const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class setupFBoltcard1719852557357 {
    name = 'setupFBoltcard1719852557357'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "user_boltcard" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_194d0fe73d873bcbd405e73ed6e" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_d2fe5c5abd7ecad224e4a1486a7" DEFAULT getdate(), "status" nvarchar(255) NOT NULL, "boltcardId" nvarchar(255) NOT NULL, "cardName" nvarchar(255) NOT NULL, "uid" nvarchar(255) NOT NULL, "externalId" nvarchar(255) NOT NULL, "counter" int NOT NULL, "txLimit" float NOT NULL, "dailyLimit" float NOT NULL, "k0" nvarchar(255) NOT NULL, "k1" nvarchar(255) NOT NULL, "k2" nvarchar(255) NOT NULL, "prevK0" nvarchar(255) NOT NULL, "prevK1" nvarchar(255) NOT NULL, "prevK2" nvarchar(255) NOT NULL, "otp" nvarchar(255) NOT NULL, "creationTimestamp" datetime2 NOT NULL, "lightningWalletId" int, CONSTRAINT "UQ_2034c8acba4ab8768438fdabca8" UNIQUE ("boltcardId"), CONSTRAINT "PK_10389273e8cfe09471c5f955a80" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user_boltcard" ADD CONSTRAINT "FK_92759113274277cf294bd6ccde9" FOREIGN KEY ("lightningWalletId") REFERENCES "lightning_wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_boltcard" DROP CONSTRAINT "FK_92759113274277cf294bd6ccde9"`);
        await queryRunner.query(`DROP TABLE "user_boltcard"`);
    }
}
