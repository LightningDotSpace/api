const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class addDebugWallet1769204578000 {
    name = 'addDebugWallet1769204578000'

    async up(queryRunner) {
        // Update existing wallet to DEBUG role
        // Note: Wallet must already exist (created via normal registration flow)
        await queryRunner.query(`UPDATE wallet SET role = 'Debug', updated = GETDATE() WHERE address = '0xfc2F5df4217f021C270bFD6b5C3bDB5064C97587'`);
    }

    async down(queryRunner) {
        // Revert to USER role
        await queryRunner.query(`UPDATE wallet SET role = 'User', updated = GETDATE() WHERE address = '0xfc2F5df4217f021C270bFD6b5C3bDB5064C97587'`);
    }
}
