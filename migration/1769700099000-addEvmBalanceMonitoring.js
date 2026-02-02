const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class addEvmBalanceMonitoring1769700099000 {
    name = 'addEvmBalanceMonitoring1769700099000'

    async up(queryRunner) {
        // Create new monitoring_evm_balance table
        await queryRunner.query(`
            CREATE TABLE "monitoring_evm_balance" (
                "id" int NOT NULL IDENTITY(1,1),
                "created" datetime2 NOT NULL CONSTRAINT "DF_monitoring_evm_balance_created" DEFAULT getdate(),
                "updated" datetime2 NOT NULL CONSTRAINT "DF_monitoring_evm_balance_updated" DEFAULT getdate(),
                "blockchain" varchar(50) NOT NULL,
                "nativeSymbol" varchar(10) NOT NULL,
                "nativeBalance" float NOT NULL CONSTRAINT "DF_monitoring_evm_balance_nativeBalance" DEFAULT 0,
                "tokenBalances" nvarchar(max),
                CONSTRAINT "PK_monitoring_evm_balance" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX "IDX_monitoring_evm_balance_blockchain" ON "monitoring_evm_balance" ("blockchain")`);

        // Insert EVM token configurations into monitoring table
        const evmConfigs = [
            {
                name: 'ethereum',
                config: {
                    nativeSymbol: 'ETH',
                    tokens: [
                        { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
                        { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
                        { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
                    ],
                },
            },
            {
                name: 'polygon',
                config: {
                    nativeSymbol: 'MATIC',
                    tokens: [
                        { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
                    ],
                },
            },
            {
                name: 'citrea',
                config: {
                    nativeSymbol: 'cBTC',
                    tokens: [
                        { symbol: 'JUSD', address: '0x0987D3720D38847ac6dBB9D025B9dE892a3CA35C', decimals: 18 },
                        { symbol: 'WBTCe', address: '0xDF240DC08B0FdaD1d93b74b5048871232f6BEA3d', decimals: 8 },
                    ],
                },
            },
        ];

        for (const { name, config } of evmConfigs) {
            const value = JSON.stringify(config).replace(/'/g, "''");
            await queryRunner.query(`
                INSERT INTO "monitoring" ("type", "name", "value", "created", "updated")
                VALUES ('evm_token_config', '${name}', '${value}', GETDATE(), GETDATE())
            `);
        }
    }

    async down(queryRunner) {
        // Remove EVM token configurations from monitoring table
        await queryRunner.query(`DELETE FROM "monitoring" WHERE "type" = 'evm_token_config'`);

        // Drop monitoring_evm_balance table
        await queryRunner.query(`DROP INDEX "IDX_monitoring_evm_balance_blockchain" ON "monitoring_evm_balance"`);
        await queryRunner.query(`DROP TABLE "monitoring_evm_balance"`);
    }
}
