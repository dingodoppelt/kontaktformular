# Kontaktformular
Small nodejs script to receive data from a contact form, filter for spam, save the data and send a notification to a ntfy.sh server.

## Setup
This is intended to be run as a systemd service.  
In your systemd unit file you need to set a few variables:  
```
NTFY_PORT
NTFY_URL
NTFY_TOKEN
SERV_PORT
```

<sub>example systemd unit:</sub>
```
[Unit]
Description=Kontaktformular Node.js Server
After=network.target nginx.service

[Service]
ExecStart=/usr/bin/node /path/to/kontaktformular/kontakt.js
Restart=always
RestartSec=5
User=username
Environment="NODE_ENV=production" "NTFY_URL=push.example.com" "NTFY_TOKEN=/secret" "NTFY_PORT=443" "SERV_PORT=12345"
WorkingDirectory=/path/to/kontaktformular/
SyslogIdentifier=kontaktformular-nodejs

[Install]
WantedBy=multi-user.target
```

<sub>example config for nginx:</sub>
```
limit_req_zone $binary_remote_addr zone=mylimit:10m rate=6r/m;
server {
        location /kontakt {
                limit_req zone=mylimit burst=2 nodelay;
                proxy_pass http://localhost:12345/kontakt;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
}
```
You can set up a rate limiter against spam in nginx as shown above.
The location block forwards the requests to the backend. Make sure to match the `proxy_pass` port to the portnumber you configured in the systemd unit (`SERV_PORT`)

## Blocklist
Simply create a file `blocklist.txt` in the root folder of the app and fill it with words or phrases delimited by newlines.  
**After making changes to the blocklist you need to reload the systemd unit with:** `systemctl restart`  
<sub>example blocklist.txt:</sub>
```
unsubscribe
free shipping
lifetime warranty
info@example.com
example.com
```
