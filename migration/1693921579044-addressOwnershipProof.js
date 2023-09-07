const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class addressOwnershipProof1693921579044 {
    name = 'addressOwnershipProof1693921579044'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "dbo"."wallet" ADD "addressOwnershipProof" nvarchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "dbo"."wallet" ADD CONSTRAINT "UQ_e27ddf84aefa72d600acbf393c5" UNIQUE ("addressOwnershipProof")`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "dbo"."wallet" DROP CONSTRAINT "UQ_e27ddf84aefa72d600acbf393c5"`);
        await queryRunner.query(`ALTER TABLE "dbo"."wallet" DROP COLUMN "addressOwnershipProof"`);
    }
}
