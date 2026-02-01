const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class addDebugWallet0x443BD91769965549000 {
    name = 'addDebugWallet0x443BD91769965549000'

    async up(queryRunner) {
        await queryRunner.query(`UPDATE wallet SET role = 'Debug', updated = GETDATE() WHERE address = '0x443BD9ebf4B03Ea9B7E1eaC56eAea73B408d14af'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`UPDATE wallet SET role = 'User', updated = GETDATE() WHERE address = '0x443BD9ebf4B03Ea9B7E1eaC56eAea73B408d14af'`);
    }
}
