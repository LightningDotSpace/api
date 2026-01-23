# lightning.space API

API for lightning.space custodial service

Do not merge this state into PRD!

## Debug Endpoint

The API provides a debug endpoint for authorized users to execute read-only SQL queries and access Azure Application Insights logs.

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/support/debug` | POST | Execute SQL SELECT queries |
| `/support/debug/logs` | POST | Query Azure Application Insights |

### Authorization

Access requires a wallet with the `DEBUG` role. The role hierarchy allows `ADMIN` users to also access debug endpoints.

### Getting Access

1. **Generate wallet credentials** from a mnemonic seed:
   ```bash
   node -e "
   const { ethers } = require('ethers');
   const mnemonic = '<your-12-word-seed>';
   const wallet = ethers.Wallet.fromMnemonic(mnemonic);
   const message = 'By_signing_this_message,_you_confirm_to_lightning.space_that_you_are_the_sole_owner_of_the_provided_Blockchain_address._Your_ID:_' + wallet.address;
   console.log('Address:', wallet.address);
   wallet.signMessage(message).then(sig => console.log('Signature:', sig));
   "
   ```

2. **Register the wallet** on the target environment (dev/prd) via the normal registration flow.

3. **Create a migration** to grant DEBUG role:
   ```javascript
   // migration/<timestamp>-addDebugWallet.js
   const { MigrationInterface, QueryRunner } = require("typeorm");

   module.exports = class addDebugWallet<timestamp> {
       name = 'addDebugWallet<timestamp>'

       async up(queryRunner) {
           await queryRunner.query(`UPDATE wallet SET role = 'Debug', updated = GETDATE() WHERE address = '<wallet-address>'`);
       }

       async down(queryRunner) {
           await queryRunner.query(`UPDATE wallet SET role = 'User', updated = GETDATE() WHERE address = '<wallet-address>'`);
       }
   }
   ```

4. **Configure environment** - create `.env` in the api root:
   ```
   DEBUG_ADDRESS=<wallet-address>
   DEBUG_SIGNATURE=<signature>
   DEBUG_API_URL=https://lightning.space/v1  # or https://dev.lightning.space/v1
   ```

### Usage

**SQL Queries:**
```bash
./scripts/db-debug.sh "SELECT TOP 10 * FROM wallet"
./scripts/db-debug.sh "SELECT * FROM monitoring_balance"
```

**Log Queries:**
```bash
./scripts/log-debug.sh exceptions           # Recent exceptions
./scripts/log-debug.sh failures             # Failed requests
./scripts/log-debug.sh slow 2000            # Slow dependencies (>2000ms)
./scripts/log-debug.sh traces "error"       # Search traces
./scripts/log-debug.sh operation <guid>     # Traces by operation ID
```

### Security

- Only `SELECT` queries allowed (no INSERT, UPDATE, DELETE)
- Sensitive columns are automatically masked (signatures, keys, secrets)
- System schemas blocked (sys, information_schema)
- All queries are logged for audit
