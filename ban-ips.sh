#!/bin/bash

if (( $EUID != 0 )); then
    echo "Please run as root"
    exit
fi

if [[ $# -ne 1 ]]; then
	echo "No file supplied as first argument, trying default (./banned.txt)..."
        if [[ -e "banned.txt" ]]; then
		BANLIST="banned.txt"
	else
		echo "Couldn't find a file with IP addresses to ban, exiting..."
		exit 1
	fi
else
	if [[ -e "$1"  ]]; then
		BANLIST=$1
	else
		echo "File $1 not found, exiting..."
		exit 1
	fi
fi

echo "Found $BANLIST"

for IP in $(cat $BANLIST);
do
	nft add element ip kontaktform banset { $IP };
done
