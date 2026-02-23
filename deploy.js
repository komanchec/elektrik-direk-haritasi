const { Client } = require('ssh2');

const sshConfig = {
    host: '38.3.137.165',
    port: 22,
    username: 'root',
    password: 'Onurakkaya123.*'
};

const commands = [
    // 1. Update system and install prerequisites
    'sudo apt-get update -y',
    'sudo apt-get install -y curl git ufw nginx',

    // 2. Install Node.js 18.x
    'curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -',
    'sudo apt-get install -y nodejs',

    // 3. Install PM2 globally
    'sudo npm install -g pm2',

    // 4. Setup firewall 
    'sudo ufw allow ssh',
    'sudo ufw allow 80',
    'sudo ufw allow 3000',
    'echo "y" | sudo ufw enable',

    // 5. Clone repository
    'sudo mkdir -p /var/www',
    'if [ -d "/var/www/elektrik-direk-haritasi" ]; then sudo rm -rf /var/www/elektrik-direk-haritasi; fi',
    'cd /var/www && sudo git clone https://github.com/komanchec/elektrik-direk-haritasi.git',

    // 6. Install project dependencies & start app
    'cd /var/www/elektrik-direk-haritasi && sudo npm install',
    'cd /var/www/elektrik-direk-haritasi && pm2 start server.js --name cbs-app',

    // 7. Save pm2 to restart on boot
    'pm2 save',
    'pm2 startup | tail -n 1 > pm2_startup.sh && sudo sh pm2_startup.sh',

    // 8. Configure Nginx as Reverse Proxy
    `cat << 'EOF' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF`,
    'sudo systemctl restart nginx'
];

const execCommand = (conn, cmd) => {
    return new Promise((resolve, reject) => {
        console.log(`\n>>> Executing: ${cmd}`);
        conn.exec(cmd, { pty: true }, (err, stream) => {
            if (err) return reject(err);

            let out = '';
            stream.on('close', (code, signal) => {
                console.log(`<<< Finished with code ${code}`);
                resolve({ code, out });
            }).on('data', (data) => {
                process.stdout.write(data);
                out += data;
            }).stderr.on('data', (data) => {
                process.stderr.write(data);
                out += data;
            });
        });
    });
};

const runDeploy = async () => {
    const conn = new Client();
    conn.on('ready', async () => {
        console.log('--- SSH Connection Established ---');
        try {
            for (const cmd of commands) {
                await execCommand(conn, cmd);
            }
            console.log('\n✅ Deployment successful! App should be running on http://38.3.137.165');
        } catch (err) {
            console.error('\n❌ Deployment failed:', err);
        } finally {
            conn.end();
        }
    }).on('error', (err) => {
        console.error('SSH Error:', err);
    }).connect(sshConfig);
};

runDeploy();
