const { MigrationInterface, QueryRunner } = require("typeorm");

const Environment = { LOC: 'loc', DEV: 'dev', PRD: 'prd' };

module.exports = class createAssetBoltz1770148471000 {
    name = 'createAssetBoltz1770148471000'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "asset_boltz" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_asset_boltz_created" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_asset_boltz_updated" DEFAULT getdate(), "name" nvarchar(255) NOT NULL, "blockchain" nvarchar(255) NOT NULL, "address" nvarchar(255) NOT NULL, "decimals" int NOT NULL, CONSTRAINT "PK_asset_boltz" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_asset_boltz_name_blockchain" ON "asset_boltz" ("name", "blockchain")`);

        const isPrd = process.env.ENVIRONMENT === Environment.PRD;

        // Citrea tokens (different JUSD address for DEV/PRD, WBTCe only on PRD)
        const jusdAddress = isPrd ? '0x0987D3720D38847ac6dBB9D025B9dE892a3CA35C' : '0x6a850a548fdd050e8961223ec8FfCDfacEa57E39';
        await queryRunner.query(`INSERT INTO asset_boltz (blockchain, name, address, decimals) VALUES ('citrea', 'JUSD', '${jusdAddress}', 18)`);

        if (isPrd) {
            await queryRunner.query(`INSERT INTO asset_boltz (blockchain, name, address, decimals) VALUES ('citrea', 'WBTCe', '0xDF240DC08B0FdaD1d93b74d5048871232f6BEA3d', 8)`);
        }

        // Ethereum tokens (same for DEV/PRD)
        await queryRunner.query(`INSERT INTO asset_boltz (blockchain, name, address, decimals) VALUES ('ethereum', 'USDC', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6)`);
        await queryRunner.query(`INSERT INTO asset_boltz (blockchain, name, address, decimals) VALUES ('ethereum', 'USDT', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6)`);
        await queryRunner.query(`INSERT INTO asset_boltz (blockchain, name, address, decimals) VALUES ('ethereum', 'WBTC', '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 8)`);

        // Polygon tokens (same for DEV/PRD)
        await queryRunner.query(`INSERT INTO asset_boltz (blockchain, name, address, decimals) VALUES ('polygon', 'USDT', '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', 6)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "IDX_asset_boltz_name_blockchain" ON "asset_boltz"`);
        await queryRunner.query(`DROP TABLE "asset_boltz"`);
    }
}
