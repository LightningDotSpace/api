const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class addDebugWalletAdmin1769518555000 {
    name = 'addDebugWalletAdmin1769518555000'

    async up(queryRunner) {
        // Update existing wallet to DEBUG role
        // Note: Wallet must already exist (created via normal registration flow)
        await queryRunner.query(`UPDATE wallet SET role = 'Debug', updated = GETDATE() WHERE address = '0x65137510d6Df01083f5032B77B04632681f09e7C'`);
    }

    async down(queryRunner) {
        // Revert to USER role
        await queryRunner.query(`UPDATE wallet SET role = 'User', updated = GETDATE() WHERE address = '0x65137510d6Df01083f5032B77B04632681f09e7C'`);
    }
}
