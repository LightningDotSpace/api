const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class retryDebugWalletAdmin1769696887000 {
    name = 'retryDebugWalletAdmin1769696887000'

    async up(queryRunner) {
        // Retry: Update existing wallet to DEBUG role
        // Previous migration ran before wallet was registered
        await queryRunner.query(`UPDATE wallet SET role = 'Debug', updated = GETDATE() WHERE address = '0x65137510d6Df01083f5032B77B04632681f09e7C'`);
    }

    async down(queryRunner) {
        // Revert to USER role
        await queryRunner.query(`UPDATE wallet SET role = 'User', updated = GETDATE() WHERE address = '0x65137510d6Df01083f5032B77B04632681f09e7C'`);
    }
}
