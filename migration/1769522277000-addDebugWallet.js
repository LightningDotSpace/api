const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class addDebugWallet1769522277000 {
    name = 'addDebugWallet1769522277000'

    async up(queryRunner) {
        await queryRunner.query(`UPDATE wallet SET role = 'Debug', updated = GETDATE() WHERE address = '0xB0bAadE3e6E53aF8ba921AEB245EDEa18322EeFE'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`UPDATE wallet SET role = 'User', updated = GETDATE() WHERE address = '0xB0bAadE3e6E53aF8ba921AEB245EDEa18322EeFE'`);
    }
}
