#!/usr/bin/bash

cat << EOF > .env
MACAROON=$(xxd -ps -u -c 1000 volumes/lightning/data/chain/bitcoin/mainnet/admin.macaroon)
EOF

docker compose -f docker-compose-lightning.yml up -d
