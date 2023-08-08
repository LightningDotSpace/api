#!/usr/bin/bash

cat << EOF > .env
MACAROON=$(xxd -ps -u -c 1000 volumes/lightning/data/chain/bitcoin/testnet/admin.macaroon)
EOF

docker compose up -d
