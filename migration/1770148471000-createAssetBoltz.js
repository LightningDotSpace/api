/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

/**
 * @class
 * @implements {MigrationInterface}
 */
module.exports = class CreateAssetBoltz1770192795341 {
    name = 'CreateAssetBoltz1770192795341'

    /**
     * @param {QueryRunner} queryRunner
     */
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "asset_boltz" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_f8eee661bfc0ba34f0f18960a35" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_bf77b89d4b7d1e854206229afea" DEFAULT getdate(), "name" nvarchar(255) NOT NULL, "blockchain" nvarchar(255) NOT NULL, "address" nvarchar(255) NOT NULL, "decimals" int NOT NULL, CONSTRAINT "PK_ff1e802368b299c2f1a88ec1af6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a5500b6a3fca6dd68cc08ea756" ON "asset_boltz" ("name", "blockchain") `);
    }

    /**
     * @param {QueryRunner} queryRunner
     */
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "IDX_a5500b6a3fca6dd68cc08ea756" ON "asset_boltz"`);
        await queryRunner.query(`DROP TABLE "asset_boltz"`);
    }
}
