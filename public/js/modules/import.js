// ============================================
// İÇE AKTARMA (CSV & GPX Import)
// ============================================
import { state } from './state.js';
import { api } from './api.js';
import { showNotification } from './ui.js';
import { loadDirekler } from './direk.js';

// ---- CSV Import ----

export function topluImportModal() {
    if (!state.currentProject) {
        alert('Once bir proje secin!');
        return;
    }

    const html = `
    <div class="modal" id="importModal" style="display: flex;">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Excel/CSV Import</h2>
                <button class="close-btn" onclick="document.getElementById('importModal').remove()">&times;</button>
            </div>
            <p style="margin-bottom: 15px; color: #64748b; font-size: 13px;">
                CSV dosyaniz su sutunlari icermelidir:<br>
                <b>numara, lat, lng</b> (tip_id ve cins_id opsiyonel)
            </p>
            <input type="file" id="importFile" accept=".csv,.txt" style="margin-bottom: 15px;">
            <button class="btn btn-success" onclick="topluImportYap()">Import Et</button>
            <div id="importSonuc" style="margin-top: 15px;"></div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

export async function topluImportYap() {
    const fileInput = document.getElementById('importFile');
    if (!fileInput.files[0]) {
        alert('Dosya secin!');
        return;
    }

    const text = await fileInput.files[0].text();
    const lines = text.trim().split('\n');

    if (lines.length < 2) {
        alert('Dosyada veri bulunamadi!');
        return;
    }

    const header = lines[0].toLowerCase().split(/[,;\t]/);
    const numaraIdx = header.findIndex(h => h.trim().includes('numara'));
    const latIdx = header.findIndex(h => h.trim().includes('lat') || h.trim().includes('enlem'));
    const lngIdx = header.findIndex(h => h.trim().includes('lng') || h.trim().includes('lon') || h.trim().includes('boylam'));

    if (numaraIdx === -1 || latIdx === -1 || lngIdx === -1) {
        alert('Gecersiz format! numara, lat, lng sutunlari gerekli.');
        return;
    }

    const direkler = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/[,;\t]/);
        if (cols.length > Math.max(numaraIdx, latIdx, lngIdx)) {
            const numara = cols[numaraIdx].trim().replace(/"/g, '');
            const lat = parseFloat(cols[latIdx].trim());
            const lng = parseFloat(cols[lngIdx].trim());

            if (numara && !isNaN(lat) && !isNaN(lng)) {
                direkler.push({ numara, lat, lng, tip_id: 1, cins_id: 1 });
            }
        }
    }

    if (direkler.length === 0) {
        alert('Gecerli veri bulunamadi!');
        return;
    }

    try {
        const res = await api(`/direkler/import/${state.currentProject}`, {
            method: 'POST',
            body: JSON.stringify({ direkler })
        });

        const sonucDiv = document.getElementById('importSonuc');
        sonucDiv.innerHTML = `
            <div style="color: #10b981; font-weight: bold;">
                ${res.imported} / ${res.total} direk import edildi.
                ${res.errors.length > 0 ? '<br>Hatalar: ' + res.errors.map(e => 'Satir ' + e.satir + ': ' + e.hata).join(', ') : ''}
            </div>
        `;

        loadDirekler(state.currentProject);
        showNotification(`${res.imported} direk import edildi`, 'success');
    } catch (err) {
        console.error('Import hatasi:', err);
        showNotification('Import basarisiz', 'error');
    }
}

// ---- GPX Import ----

export function gpxImportModal() {
    const html = `
        <div class="modal" id="gpxModal" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>GPX/KML Dosya Import</h2>
                    <button class="close-btn" onclick="document.getElementById('gpxModal').remove()">&times;</button>
                </div>
                <p>GPS cihazından veya telefondan kaydedilmiş GPX/KML dosyası yükleyin:</p>
                <input type="file" id="gpxFile" accept=".gpx,.kml" onchange="gpxYukle(this)">
                <div id="gpxSonuc" style="margin-top: 15px;"></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

export async function gpxYukle(input) {
    if (!state.currentProject) {
        alert('Önce proje seçin!');
        return;
    }

    if (!input.files[0]) return;

    const formData = new FormData();
    formData.append('gpx', input.files[0]);

    showNotification('Dosya yükleniyor...', 'info');

    try {
        const res = await fetch(`${state.API_URL}/direkler/gpx-import/${state.currentProject}`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + state.token },
            body: formData
        });

        const data = await res.json();

        if (data.imported > 0) {
            const modal = document.getElementById('gpxModal');
            if (modal) modal.remove();

            showNotification(`${data.imported} adet Direk haritaya eklendi!`, 'success');

            // Yeni eklenen direklerin haritada görünmesi için direkleri yenile
            loadDirekler(state.currentProject);
        }

    } catch (err) {
        showNotification('Import hatası', 'error');
    }
}

export async function gpsNoktalariGoster() {
    const noktalar = await api(`/direkler/proje/${state.currentProject}/gps`);

    noktalar.forEach(n => {
        L.circleMarker([n.lat, n.lng], {
            radius: 6,
            fillColor: '#f59e0b',
            fillOpacity: 0.8,
            color: '#fff',
            weight: 2
        }).addTo(state.map).bindPopup(`
            <b>${n.ad}</b><br>
            Yükseklik: ${n.yukseklik || '-'} m<br>
            Tarih: ${n.olcum_tarihi || '-'}
        `);
    });

    showNotification(`${noktalar.length} GPS noktası gösterildi`, 'success');
}
