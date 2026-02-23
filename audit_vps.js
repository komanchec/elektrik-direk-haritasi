const { Client } = require('ssh2');

const sshConfig = {
    host: '38.3.137.165',
    port: 22,
    username: 'root',
    password: 'Onurakkaya123.*'
};

const commands = [
    'pm2 status',
    'pm2 logs app --lines 20',
    'sudo firewall-cmd --list-all',
    'sudo ss -tulpn | grep 3000'
];

const execCommand = (conn, cmd) => {
    return new Promise((resolve, reject) => {
        console.log(`\n\n================================`);
        console.log(`>>> Executing: ${cmd}`);
        console.log(`================================`);
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

const runAudit = async () => {
    const conn = new Client();
    conn.on('ready', async () => {
        console.log('--- SSH Connection Established ---');
        try {
            for (const cmd of commands) {
                await execCommand(conn, cmd);
            }
        } catch (err) {
            console.error('\n❌ Audit failed:', err);
        } finally {
            conn.end();
        }
    }).on('error', (err) => {
        console.error('SSH Error:', err);
    }).connect(sshConfig);
};

runAudit();
