const http = require('http');
const https = require('https');
const querystring = require('querystring');
const fs = require('fs/promises');
const { exec } = require('node:child_process');
const blocklist = require('fs').readFileSync('blocklist.txt', 'utf-8')
.toLowerCase()
.split('\n')
.filter(Boolean);
// Set your env variables in your systemd unit like so:
// Environment="NTFY_URL=https://ntfy.example.com" "NTFY_TOKEN=geheim" "NTFY_PORT=3030" "SERV_PORT=12345"
const NTFY_URL = process.env.NTFY_URL;
const NTFY_TOKEN = process.env.NTFY_TOKEN;
const NTFY_PORT = process.env.NTFY_PORT;
const SERV_PORT = process.env.SERV_PORT;
const NFT_SET = process.env.NFT_SET;

function checkSpam(text) {
    const txt = (text ?? '').toLowerCase();
    return blocklist.some(word => word.length > 0 && txt.includes(word));
}

function sendToNtfy(message) {
    const data = message;
    
    const options = {
        hostname: NTFY_URL,
        port: NTFY_PORT,
        path: NTFY_TOKEN,
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain',
            'Content-Length': data.length,
        }
    };
    
    const req = https.request(options, res => {
        console.log(`ntfy Status: ${res.statusCode}`);
    });
    
    req.on('error', error => {
        console.error('Fehler bei ntfy:', error);
    });
    
    req.write(data);
    req.end();
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/kontakt') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            const parsedData = querystring.parse(body);
            const plainData = { ...parsedData };
            const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
            console.log('Formulardaten erhalten:', JSON.stringify(plainData, null, 2), ip);
            
            if (parsedData.website ||
                checkSpam(parsedData.email) ||
                checkSpam(parsedData.nachricht)
            ) {
                console.log('Spam erkannt. Ignoriert.');
                // res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
                // res.end("Thanks for your message... NOT");
                res.statusCode = 404;
                res.end('Not found');
		if (NFT_SET) {
		    console.log(`${ip} wird im set ${NFT_SET} gebannt`);
		    await fs.appendFile('blocked-ips.txt', ip + "\n");
		    exec(`nft add element ${NFT_SET} { ${ip} }`, (err, stdout, stderr) => {
				if (err) console.error(err);
		    });
		}
                return;
            }
            
            const dataToSave = `${new Date().toISOString()} - ${JSON.stringify(parsedData)}\n`;
            await fs.appendFile('formdata.txt', dataToSave);
            
            const message = `Email: ${parsedData.email}\nNachricht: ${parsedData.nachricht}`;
            sendToNtfy(message);
            
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(`
            <!DOCTYPE html>
            <html lang="de">
            <head>
            <meta charset="UTF-8" />
            <title>Nachricht gesendet</title>
            <meta http-equiv="refresh" content="3; url=/" />
            </head>
            <body>
            <p>Vielen Dank! Ihre Nachricht wurde gesendet.</p>
            <p>Sie werden in 3 Sekunden zurück zum Formular geleitet.</p>
            <p>Falls nicht, klicken Sie <a href="/">hier</a>.</p>
            </body>
            </html>
            `);
        });
    } else {
        res.statusCode = 404;
        res.end('Not found');
    }
});

server.listen(SERV_PORT, () => {
    console.log(`Server läuft auf http://localhost:${SERV_PORT}`);
});
