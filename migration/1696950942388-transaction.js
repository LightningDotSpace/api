const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class transaction1696950942388 {
    name = 'transaction1696950942388'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "sqldb-lds-api-dev".."user_transaction" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_1019086e384f799f2bdbe3f6085" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_cdd9335d11e2e19c02b5c5fa397" DEFAULT getdate(), "type" nvarchar(255) NOT NULL, "amount" float NOT NULL, "fee" float NOT NULL CONSTRAINT "DF_7be69ef7332f2d6ad05b8e70a06" DEFAULT 0, "balance" float, "creationTimestamp" datetime2 NOT NULL, "expiresTimestamp" datetime2, "tag" nvarchar(255), "lightningWalletId" int, "lightningTransactionId" int NOT NULL, CONSTRAINT "PK_e36b77a5263ac0f191277c4c5d2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sqldb-lds-api-dev".."transaction_lightning" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_3ba7baa12ab2299212be619da72" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_7250c44e737cdc826f69ea92eb5" DEFAULT getdate(), "type" nvarchar(255) NOT NULL, "state" nvarchar(255) NOT NULL, "transaction" nvarchar(255) NOT NULL, "secret" nvarchar(255) NOT NULL, "publicKey" nvarchar(255), "amount" float NOT NULL, "fee" float NOT NULL CONSTRAINT "DF_30767c0861424ab2245c94eb40a" DEFAULT 0, "balance" float, "creationTimestamp" datetime2 NOT NULL, "expiresTimestamp" datetime2, "confirmedTimestamp" datetime2, "description" nvarchar(MAX), "reason" nvarchar(255), "paymentRequest" nvarchar(MAX), CONSTRAINT "PK_4f9024cfed331c3c379a9b481c0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sqldb-lds-api-dev".."transaction_onchain" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_bb7bdeaf8c0bf5c34d7bf70cb89" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_957b30bd3550a277c6d6f72917c" DEFAULT getdate(), "transaction" nvarchar(255) NOT NULL, "amount" float NOT NULL, "fee" float NOT NULL CONSTRAINT "DF_4d458978566a4ffa3a28ae2d761" DEFAULT 0, "balance" float, "block" int NOT NULL, "timestamp" datetime2 NOT NULL, CONSTRAINT "UQ_8a233973c49afbbc14a01ce076b" UNIQUE ("transaction"), CONSTRAINT "PK_00b0ebb5b154922c59e2b502d19" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "sqldb-lds-api-dev".."user_transaction" ADD CONSTRAINT "FK_34942e502f3c64e570462407e2a" FOREIGN KEY ("lightningWalletId") REFERENCES "sqldb-lds-api-dev".."lightning_wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sqldb-lds-api-dev".."user_transaction" ADD CONSTRAINT "FK_b2a00eab28ff6b7052c4eee695f" FOREIGN KEY ("lightningTransactionId") REFERENCES "sqldb-lds-api-dev".."transaction_lightning"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "sqldb-lds-api-dev".."user_transaction" DROP CONSTRAINT "FK_b2a00eab28ff6b7052c4eee695f"`);
        await queryRunner.query(`ALTER TABLE "sqldb-lds-api-dev".."user_transaction" DROP CONSTRAINT "FK_34942e502f3c64e570462407e2a"`);
        await queryRunner.query(`DROP TABLE "sqldb-lds-api-dev".."transaction_onchain"`);
        await queryRunner.query(`DROP TABLE "sqldb-lds-api-dev".."transaction_lightning"`);
        await queryRunner.query(`DROP TABLE "sqldb-lds-api-dev".."user_transaction"`);
    }
}
