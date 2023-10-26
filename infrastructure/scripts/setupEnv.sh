#!/bin/bash

cd ~
mkdir backup
mkdir volumes

cd ~/volumes
mkdir bitcoin
mkdir lightning
mkdir taproot
mkdir lnbits
mkdir thunderhub
mkdir nginx

cd ~

sudo apt install wget
sudo apt install iputils-ping
sudo apt install dnsutils
sudo apt install iproute2
sudo apt install net-tools
sudo apt install vim

sudo apt install sqlite3
