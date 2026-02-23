const { Client } = require('ssh2');

const sshConfig = {
    host: '38.3.137.165',
    port: 22,
    username: 'root',
    password: 'Onurakkaya123.*'
};

const commands = [
    'node -v',
    'sudo dnf module reset nodejs -y',
    'sudo dnf module enable nodejs:18 -y',
    'sudo dnf install nodejs -y',
    'node -v',
    'cd /var/www/elektrik-direk-haritasi && pm2 restart app'
];

const execCommand = (conn, cmd) => {
    return new Promise((resolve, reject) => {
        console.log(`\n================================`);
        console.log(`>>> Executing: ${cmd}`);
        conn.exec(cmd, { pty: true }, (err, stream) => {
            if (err) return reject(err);

            let out = '';
            stream.on('close', (code, signal) => {
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

const fixNode = async () => {
    const conn = new Client();
    conn.on('ready', async () => {
        console.log('--- SSH Connection Established ---');
        try {
            for (const cmd of commands) {
                await execCommand(conn, cmd);
            }
        } catch (err) {
            console.error('\n❌ Fix failed:', err);
        } finally {
            conn.end();
        }
    }).connect(sshConfig);
};

fixNode();
