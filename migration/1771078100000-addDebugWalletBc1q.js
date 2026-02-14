const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class addDebugWalletBc1q1771078100000 {
    name = 'addDebugWalletBc1q1771078100000'

    async up(queryRunner) {
        await queryRunner.query(`UPDATE wallet SET role = 'Debug', updated = GETDATE() WHERE address = 'bc1qv4hs4qkaw3y3e8q5z6lewuvlv7dus75az4gxxy'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`UPDATE wallet SET role = 'User', updated = GETDATE() WHERE address = 'bc1qv4hs4qkaw3y3e8q5z6lewuvlv7dus75az4gxxy'`);
    }
}
