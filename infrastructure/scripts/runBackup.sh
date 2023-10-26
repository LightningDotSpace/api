#!/bin/bash

timestamp=`date +%Y%m%d%H%M%S`

/usr/bin/cp ./docker-compose.sh ./backup/${timestamp}-docker-compose.sh
/usr/bin/cp ./docker-compose.yml ./backup/${timestamp}-docker-compose.yml

/usr/bin/zip -r ./backup/${timestamp}-bitcoin.zip ./volumes/bitcoin/bitcoin.conf ./volumes/bitcoin/wallets
/usr/bin/zip -r ./backup/${timestamp}-lightning.zip ./volumes/lightning
/usr/bin/zip -r ./backup/${timestamp}-taproot.zip ./volumes/taproot
/usr/bin/zip -r ./backup/${timestamp}-lnbits.zip ./volumes/lnbits
/usr/bin/zip -r ./backup/${timestamp}-thunderhub.zip ./volumes/thunderhub
/usr/bin/zip -r ./backup/${timestamp}-nginx.zip ./volumes/nginx
