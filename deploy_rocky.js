const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sshConfig = {
    host: '38.3.137.165',
    port: 22,
    username: 'root',
    password: 'Onurakkaya123.*'
};

console.log('📦 Proje yerel olarak paketleniyor...');
try {
    // Exclude node_modules, .git, and .gemini while creating tarball
    execSync('tar.exe -czvf app.tar.gz --exclude=node_modules --exclude=.git --exclude=.gemini --exclude=app.tar.gz *', { stdio: 'inherit' });
    console.log('✅ Paketleme tamamlandı: app.tar.gz');
} catch (e) {
    console.error('❌ Paketleme hatası:', e.message);
    process.exit(1);
}

const commands = [
    // 1. DNF Update ve Gerekli Paketler
    'sudo dnf update -y',
    'sudo dnf install -y curl tar nodejs',

    // 2. PM2 Kurulumu
    'sudo npm install -g pm2',

    // 3. Güvenlik Duvarı (Firewalld)
    'sudo systemctl start firewalld',
    'sudo systemctl enable firewalld',
    'sudo firewall-cmd --permanent --add-port=3000/tcp',
    'sudo firewall-cmd --permanent --add-port=80/tcp',
    'sudo firewall-cmd --reload',

    // 4. Hedef klasörü oluştur ve arşivi aç
    'sudo mkdir -p /var/www/elektrik-direk-haritasi',
    'sudo tar -xzvf /tmp/app.tar.gz -C /var/www/elektrik-direk-haritasi',

    // 5. Bağımlılıkları kur ve PM2 ile başlat
    'cd /var/www/elektrik-direk-haritasi && sudo npm install',
    'cd /var/www/elektrik-direk-haritasi && pm2 start server.js --name app',

    // 6. PM2 başlangıç kaydı
    'pm2 save',
    'pm2 startup | tail -n 1 > pm2_startup.sh && sudo sh pm2_startup.sh'
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

    conn.on('ready', () => {
        console.log('--- SSH Bağlantısı Kuruldu ---');

        conn.sftp((err, sftp) => {
            if (err) throw err;

            const localFile = path.join(__dirname, 'app.tar.gz');
            const remoteFile = '/tmp/app.tar.gz';

            console.log(`📤 ${localFile} dosyası sunucuya yükleniyor...`);

            sftp.fastPut(localFile, remoteFile, async (err) => {
                if (err) {
                    console.error('❌ Dosya yükleme hatası:', err);
                    conn.end();
                    return;
                }

                console.log('✅ Dosya başarıyla yüklendi!');

                try {
                    for (const cmd of commands) {
                        await execCommand(conn, cmd);
                    }
                    console.log('\n🚀 Kurulum Başarılı! Uygulamanız http://38.3.137.165:3000 adresinde yayında olmalı.');
                } catch (err) {
                    console.error('\n❌ Kurulum sırasında hata:', err);
                } finally {
                    conn.end();
                    fs.unlinkSync(localFile); // Arşivi sil
                }
            });
        });
    }).on('error', (err) => {
        console.error('SSH Error:', err);
    }).connect(sshConfig);
};

runDeploy();
