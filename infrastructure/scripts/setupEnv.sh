#!/bin/bash

cd ~
mkdir backup

mkdir -p volumes/bitcoin
mkdir -p volumes/lightning
mkdir -p volumes/taproot
mkdir -p volumes/lnbits
mkdir -p volumes/lnbitsapi
mkdir -p volumes/thunderhub
mkdir -p volumes/nginx

mkdir -p volumes/boltz/postgres
mkdir -p volumes/boltz/redis
mkdir -p volumes/boltz/backend
mkdir -p volumes/boltz/webapp

sudo apt install wget
sudo apt install iputils-ping
sudo apt install dnsutils
sudo apt install iproute2
sudo apt install net-tools
sudo apt install vim

sudo apt install sqlite3
