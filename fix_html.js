const fs = require('fs');
const path = 'c:/Users/Admin/Desktop/cbsler/WEB/elektrik-direk-haritasi/public/index.html';
let html = fs.readFileSync(path, 'utf8');

const mapping = {
    '🔍': 'Seç',
    '📍': 'Ekle',
    '📏': 'Mesafe',
    '🔌': 'Hat',
    '⛓️': 'Zincir',
    '🕸️': 'Oto Hat',
    '📐': 'CAD',
    '🗂️': 'Katman',
    '🔽': 'Filtre',
    '⬡': 'Bölge',
    '⚡': 'Trafo',
    '🔬': 'Analiz',
    '🌐': 'Koord.',
    '📱': 'Konum',
    '🚗': 'Yol',
    '📤': 'İçe Aktar',
    '📡': 'Canlı',
    '📝': 'Geçmiş',
    '🧹': 'Temizle',
    '❓': 'Yardım'
};

for (const [icon, text] of Object.entries(mapping)) {
    const rx = new RegExp(`(<span class="ribbon-icon">${icon}<\\/span>)`, 'g');
    if (!html.includes(`<span class="ribbon-text">${text}</span>`)) {
        html = html.replace(rx, `$1\n                    <span class="ribbon-text">${text}</span>`);
    }
}

fs.writeFileSync(path, html);
console.log('HTML updated');
