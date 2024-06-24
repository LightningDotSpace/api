#!/bin/bash

timestamp=`date +%Y%m%d%H%M%S`
backup_dir=./backup/${timestamp}

echo "Backup to ${backup_dir} ..."

/usr/bin/mkdir ${backup_dir}

/usr/bin/cp ./runBackup.sh ${backup_dir}
/usr/bin/cp ./docker-compose.sh ${backup_dir}
/usr/bin/cp ./docker-compose.yml ${backup_dir}

/usr/bin/tar --exclude-from="runBackup-exclude-file.txt" -cpzvf ${backup_dir}/bitcoin.tgz ./volumes/bitcoin
/usr/bin/tar --exclude-from="runBackup-exclude-file.txt" -cpzvf ${backup_dir}/lightning.tgz ./volumes/lightning
/usr/bin/tar --exclude-from="runBackup-exclude-file.txt" -cpzvf ${backup_dir}/taproot.tgz ./volumes/taproot
/usr/bin/tar --exclude-from="runBackup-exclude-file.txt" -cpzvf ${backup_dir}/lnbits.tgz ./volumes/lnbits
/usr/bin/tar --exclude-from="runBackup-exclude-file.txt" -cpzvf ${backup_dir}/lnbitsapi.tgz ./volumes/lnbitsapi
/usr/bin/tar --exclude-from="runBackup-exclude-file.txt" -cpzvf ${backup_dir}/thunderhub.tgz ./volumes/thunderhub
/usr/bin/tar --exclude-from="runBackup-exclude-file.txt" -cpzvf ${backup_dir}/nginx.tgz ./volumes/nginx
