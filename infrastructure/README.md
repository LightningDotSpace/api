# Infrastructure Deployment

1. Update parameter files
1. Temp: Update JWT secret
1. Do deployment: `az deployment group create -g rg-lds-api-{env} -f infrastructure/bicep/lightning-api.bicep -p infrastructure/bicep/parameters/{env}.json`

# VM

1. Connect to VM: `ssh {user}@vm-{user}-{type}-{env}.westeurope.cloudapp.azure.com`

# Docker Setup (dockerd)

1. Copy script `infrastructure/scripts/setupDocker.sh` to virtual machine `~/setupDocker.sh`
1. Execute script: `sudo ./setupDocker.sh`
1. Copy script `infrastructure/scripts/setupEnv.sh` to virtual machine `~/setupEnv.sh`
1. Execute script: `./setupEnv.sh`
1. Create docker network `docker network create lightning-network`
1. Copy script `infrastructure/scripts/docker-compose.sh` to virtual machine `~/docker-compose.sh`
1. Copy file `infrastructure/config/docker/{env}-docker-compose-lightning.yml` to virtual machine `~/docker-compose-lightning.yml`
1. Copy file `infrastructure/config/docker/{env}-docker-compose-nginx.yml` to virtual machine `~/docker-compose-nginx.yml`
1. Copy file `infrastructure/config/docker/{env}-docker-compose-boltz.yml` to virtual machine `~/docker-compose-boltz.yml`
1. Execute Docker Compose (see [below](#docker-compose)) after all other setup steps are done:
   1. [Bitcoin Node Setup](#bitcoin-node-setup-bitcoind)
   1. [Lightning Node Setup](#lightning-node-setup-lnd)
   1. [Taproot Setup](#taproot-setup-tapd)
   1. [LNbits Setup](#lnbits-setup)
   1. [ThunderHub Setup](#thunderhub-setup)
   1. [NGINX Setup](#nginx-setup)
   1. [Boltz Setup](#boltz-setup)

# Bitcoin Node Setup (bitcoind)

1. Copy content of config file `infrastructure/config/bitcoin/{env}-bitcoin.conf` to virtual machine `~/volumes/bitcoin/bitcoin.conf`
1. `bitcoin.conf`: Replace `[RPC-AUTH]` and `[WALLET]`
1. Actions after first startup via Docker Compose (see [below](#bitcoin-setup-after-first-startup))

# Lightning Node Setup (lnd)

1. Copy content of config file `infrastructure/config/lightning/{env}-lnd.conf` to virtual machine `~/volumes/lightning/lnd.conf`
1. `lnd.conf`: Replace `[ALIAS]`, `[RPC-USER]` and `[RPC-PASSWORD]`
1. Adapt `addpeer` values for the current environment (peer info can be found here: https://mempool.space/de/lightning)
1. Copy content of config file `infrastructure/config/lightning/{env}-pwd.txt` to virtual machine `~/volumes/lightning/pwd.txt`
1. `pwd.txt`: Replace `[PASSWORD]` with empty text for the very first startup
1. Actions after first startup via Docker Compose (see [below](#lightning-setup-after-first-startup))

# Taproot Setup (tapd)

1. Copy content of config file `infrastructure/config/taproot/{env}-tapd.conf` to virtual machine `~/volumes/taproot/tapd.conf`

# LNbits Setup

1. Copy content of config file `infrastructure/config/lnbits/{env}.env` to virtual machine `~/volumes/lnbits/.env`
1. `.env`: Replace `[ADMIN_USERS]` with empty text for the very first startup
1. Actions after first startup via Docker Compose (see [below](#lnbits-setup-after-first-startup))

# ThunderHub Setup

1. Copy content of config file `infrastructure/config/thunderhub/{env}.env` to virtual machine `~/volumes/thunderhub/.env`
1. Copy content of config file `infrastructure/config/thunderhub/{env}-accounts.yml` to virtual machine `~/volumes/thunderhub/accounts.yml`
1. `accounts.yml`: Replace `[NAME]` and `[PASSWORD]`

# NGINX Setup

1. Copy content of config file `infrastructure/config/nginx/{env}-default.conf` to virtual machine `~/volumes/nginx/default.conf`

# Boltz Setup

1. Copy content of config file `infrastructure/config/boltz/backend/{env}-boltz.conf` to virtual machine `~/volumes/boltz/backend/boltz.conf`
1. `boltz.conf`: Replace
   1. `[POSTGRES_DATABASE]` / `[POSTGRES_USERNAME]` / `[POSTGRES_PASSWORD]`
   1. `[RPC_USER]` / `[RPC_PASSWORD]`
   1. `[WALLET_NAME]`
   1. `[PROVIDER_ENDPOINT]`

# Docker Compose

The complete Bitcoin Blockchain data is loaded after the very first startup of the bitcoin node. Therefore it is recommended to copy already available blockchain data to the `~/volumes/bitcoin/...` directory.

The complete Lightning data is synchonized after the very first startup of the lightning node. This may take some time.

After Docker Compose is successfully executed for the very first time, the following actions must be performed manually:

## Bitcoin: Setup after first startup

1. Create a Bitcoin Wallet (if needed)
1. Create a Bitcoin Address (if needed)
1. Send funds to the Bitcoin Address (if needed)

## Lightning: Setup after first startup

1. Create a Lightning Wallet with a secure password
1. Set the password in the `~/volumes/lightning/pwd.txt` file
1. Create a Bitcoin Address (needed to open a channel)
1. Send funds to the Bitcoin Address (needed to open a channel)
1. Open the channels

## LNbits: Setup after first startup

1. Open a Browser and connect to LNbits at: https://vm-{user}-{type}-{env}.westeurope.cloudapp.azure.com
1. Find the User Id in the URL
1. Set the value of the `LNBITS_ADMIN_USERS` in the config file `~/volumes/lnbits/.env` to the User Id

# Infrastructure Update

## Backup

1. Run Script `runBackup.sh` before the update. This will backup all dynamic Bitcoin, Lightning, LNbits and ThunderHub data created from the different docker images - except the bitcoin blockchain.

## Update

Detailed Update Information can be found at: `https://docs.google.com/document/d/1WtpatYIxTcd-9E029Zu_4gLhd3H5MAfhytX3x-kUkwM`
