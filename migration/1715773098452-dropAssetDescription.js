const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class dropAssetDescription1715773098452 {
    name = 'dropAssetDescription1715773098452'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "asset_account" DROP COLUMN "description"`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "asset_account" ADD "description" nvarchar(255)`);
    }
}
