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

console.log('📦 Sadece değişen dosyalar paketleniyor (public klasörü)...');
try {
    // Sadece public klasörünü paketliyoruz (database'in üstüne yazmaması için)
    execSync('tar.exe -czvf update.tar.gz public/js/modules/hat.js public/js/app.js public/css/style.css', { stdio: 'inherit' });
    console.log('✅ Paketleme tamamlandı: update.tar.gz');
} catch (e) {
    console.error('❌ Paketleme hatası:', e.message);
    process.exit(1);
}

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

const runUpdate = async () => {
    const conn = new Client();

    conn.on('ready', () => {
        console.log('--- SSH Bağlantısı Kuruldu ---');

        conn.sftp((err, sftp) => {
            if (err) throw err;

            const localFile = path.join(__dirname, 'update.tar.gz');
            const remoteFile = '/tmp/update.tar.gz';

            console.log(`📤 ${localFile} dosyası sunucuya yükleniyor...`);

            sftp.fastPut(localFile, remoteFile, async (err) => {
                if (err) {
                    console.error('❌ Dosya yükleme hatası:', err);
                    conn.end();
                    return;
                }

                console.log('✅ Dosya başarıyla yüklendi!');

                try {
                    // Sadece arşivlenmeleri çıkar ve PM2'yi yeniden başlat
                    await execCommand(conn, 'sudo tar -xzvf /tmp/update.tar.gz -C /var/www/elektrik-direk-haritasi');
                    await execCommand(conn, 'pm2 restart all');
                    console.log('\n🚀 Güncelleme Başarılı! Web uygulaması yenilendi.');
                } catch (err) {
                    console.error('\n❌ Kurulum sırasında hata:', err);
                } finally {
                    conn.end();
                    if (fs.existsSync(localFile)) {
                        fs.unlinkSync(localFile);
                    }
                }
            });
        });
    }).on('error', (err) => {
        console.error('SSH Error:', err);
    }).connect(sshConfig);
};

runUpdate();
