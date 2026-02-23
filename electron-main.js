const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const { fork } = require('child_process');

// Express sunucuyu ayrı process'te başlat
let serverProcess;
function startServer() {
    return new Promise((resolve) => {
        serverProcess = fork(path.join(__dirname, 'server.js'), [], {
            silent: true
        });
        serverProcess.stdout?.on('data', (d) => console.log(d.toString()));
        serverProcess.stderr?.on('data', (d) => console.error(d.toString()));
        // Sunucunun başlaması için bekle
        setTimeout(resolve, 2000);
    });
}

let mainWindow;

function createWindow() {
    // Pencere boyutunu localStorage'dan oku (varsayılan)
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'Elektrik Direk Haritası',
        icon: path.join(__dirname, 'public', 'favicon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        show: false // Hazır olunca göster
    });

    // Hazır olunca göster (beyaz ekran önleme)
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Login sayfasını yükle
    mainWindow.loadURL('http://localhost:3000');

    // Başlık
    mainWindow.on('page-title-updated', (e) => {
        e.preventDefault();
    });
    mainWindow.setTitle('Elektrik Direk Haritası — CBS Çizim Programı');

    // Pencere kapanınca
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Menüyü oluştur
    createMenu();
}

function createMenu() {
    const template = [
        // ═══════ DOSYA ═══════
        {
            label: '📁 Dosya',
            submenu: [
                {
                    label: '📂 Yeni Proje',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => sendToRenderer('menu:yeniProje')
                },
                { type: 'separator' },
                {
                    label: '📥 DXF İçe Aktar',
                    click: () => sendToRenderer('menu:dxfImport')
                },
                {
                    label: '📤 DXF Dışa Aktar',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => sendToRenderer('menu:dxfExport')
                },
                { type: 'separator' },
                {
                    label: '📊 Excel Şablon Import',
                    click: () => sendToRenderer('menu:excelImport')
                },
                {
                    label: '📋 Excel Export',
                    click: () => sendToRenderer('menu:excelExport')
                },
                { type: 'separator' },
                {
                    label: '📐 Metraj Raporu',
                    click: () => sendToRenderer('menu:metraj')
                },
                {
                    label: '📄 PDF Rapor',
                    click: () => sendToRenderer('menu:pdfRapor')
                },
                {
                    label: '💰 Maliyet Raporu',
                    click: () => sendToRenderer('menu:maliyetRaporu')
                },
                { type: 'separator' },
                {
                    label: '🔑 KML Export',
                    click: () => sendToRenderer('menu:kmlExport')
                },
                { type: 'separator' },
                {
                    label: '❌ Çıkış',
                    accelerator: 'Alt+F4',
                    click: () => app.quit()
                }
            ]
        },

        // ═══════ DÜZENLE ═══════
        {
            label: '✏️ Düzenle',
            submenu: [
                { label: 'Geri Al', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                { label: 'Yinele', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
                { type: 'separator' },
                { label: 'Kes', accelerator: 'CmdOrCtrl+X', role: 'cut' },
                { label: 'Kopyala', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                { label: 'Yapıştır', accelerator: 'CmdOrCtrl+V', role: 'paste' },
                { label: 'Tümünü Seç', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
            ]
        },

        // ═══════ ARAÇLAR ═══════
        {
            label: '🔧 Araçlar',
            submenu: [
                {
                    label: '📐 CAD Modu',
                    accelerator: 'CmdOrCtrl+D',
                    click: () => sendToRenderer('menu:cadMode')
                },
                { type: 'separator' },
                {
                    label: '🔍 Hat Topoloji Analizi',
                    click: () => sendToRenderer('menu:hatAnaliz')
                },
                {
                    label: '⬡ Bölge Seçimi (Polygon)',
                    click: () => sendToRenderer('menu:polygonSelect')
                },
                {
                    label: '⚡ Trafo Bölgesi Tanımla',
                    click: () => sendToRenderer('menu:trafoBolge')
                },
                { type: 'separator' },
                {
                    label: '📍 Haritadan Direk Ekle',
                    accelerator: 'CmdOrCtrl+Shift+A',
                    click: () => sendToRenderer('menu:haritadanEkle')
                },
                {
                    label: '🔗 Zincirleme Hat Çiz',
                    click: () => sendToRenderer('menu:zincirleme')
                },
                { type: 'separator' },
                {
                    label: '📡 Canlı Senkronizasyon',
                    click: () => sendToRenderer('menu:liveSync')
                }
            ]
        },

        // ═══════ GÖRÜNÜM ═══════
        {
            label: '👁️ Görünüm',
            submenu: [
                {
                    label: '🗂️ Katman Yönetimi',
                    click: () => sendToRenderer('menu:katmanlar')
                },
                {
                    label: '📝 Son İşlemler',
                    click: () => sendToRenderer('menu:sonIslemler')
                },
                {
                    label: '📋 İşlem Geçmişi',
                    click: () => sendToRenderer('menu:auditLog')
                },
                { type: 'separator' },
                {
                    label: '🔍 Yakınlaştır',
                    accelerator: 'CmdOrCtrl+=',
                    click: () => mainWindow.webContents.send('menu-action', 'zoomIn')
                },
                {
                    label: '🔍 Uzaklaştır',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => mainWindow.webContents.send('menu-action', 'zoomOut')
                },
                { type: 'separator' },
                {
                    label: '🌙 Tema Değiştir',
                    accelerator: 'CmdOrCtrl+T',
                    click: () => sendToRenderer('menu:theme')
                },
                { type: 'separator' },
                {
                    label: 'Tam Ekran',
                    accelerator: 'F11',
                    click: () => {
                        mainWindow.setFullScreen(!mainWindow.isFullScreen());
                    }
                },
                { type: 'separator' },
                {
                    label: 'Geliştirici Araçları',
                    accelerator: 'F12',
                    click: () => mainWindow.webContents.toggleDevTools()
                }
            ]
        },

        // ═══════ YARDIM ═══════
        {
            label: '❓ Yardım',
            submenu: [
                {
                    label: '🎓 Uygulama Turu',
                    click: () => sendToRenderer('menu:onboarding')
                },
                { type: 'separator' },
                {
                    label: '📧 Destek',
                    click: () => shell.openExternal('mailto:destek@elektrikdirek.com')
                },
                { type: 'separator' },
                {
                    label: 'ℹ️ Hakkında',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Hakkında',
                            message: 'Elektrik Direk Haritası',
                            detail: 'Versiyon: 1.0.0\nCBS tabanlı elektrik direği çizim ve yönetim programı\n\n© 2024-2026',
                            buttons: ['Tamam']
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Renderer'a mesaj gönder (menü tıklama → frontend)
function sendToRenderer(action) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.executeJavaScript(`
            if (window._electronMenuAction) {
                window._electronMenuAction('${action}');
            }
        `);
    }
}

// ═══════ UYGULAMA BAŞLATMA ═══════
app.whenReady().then(async () => {
    await startServer();
    createWindow();
});

app.on('window-all-closed', () => {
    if (serverProcess) serverProcess.kill();
    app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});

// Güvenlik: harici link tarayıcıda aç
app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
});
