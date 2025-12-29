for IP in $(cat $1);
do
	nft add element ip kontaktform banset { $IP };
done
