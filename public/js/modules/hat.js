// ============================================
// HAT YÖNETİMİ + ZİNCİRLEME HAT
// ============================================
import { state } from './state.js';
import { api } from './api.js';
import { showNotification } from './ui.js';
import { setTool } from './tools.js';
import { direkSec, loadDirekler } from './direk.js';

// ---- İletken Renk ----

export function getIletkenRenk(tip) {
    const renkler = {
        'AAC': '#ef4444',
        'AAAC': '#3b82f6',
        'ACSR': '#10b981',
        'ACAR': '#f59e0b'
    };
    return renkler[tip] || '#64748b';
}

// ---- Hat Çizim Modu ----

export function hatCizimModuBaslat() {
    if (!state.currentProject) {
        alert('Önce proje seçin!');
        return;
    }

    state.hatCizimModu = true;
    state.hatBaslangicDirek = null;
    showNotification('Hat çizimi: Başlangıç direğine tıklayın', 'info');

    state.markers.forEach(m => {
        m.marker.setOpacity(1);
        m.marker.on('click', hatDirekSec);
    });
}

function hatDirekSec(e) {
    if (!state.hatCizimModu) return;

    const clickedMarker = e.target;
    const direkData = state.markers.find(m => m.marker === clickedMarker).data;

    if (!state.hatBaslangicDirek) {
        state.hatBaslangicDirek = direkData;
        showNotification(`Başlangıç: ${direkData.numara} - Bitiş direğine tıklayın`, 'info');

        clickedMarker.setIcon(L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="direk-marker" style="background-color: #10b981; box-shadow: 0 0 0 4px #10b981;">${direkData.numara.slice(-2)}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        }));

    } else {
        if (state.hatBaslangicDirek.id === direkData.id) {
            showNotification('Aynı direk seçilemez!', 'error');
            return;
        }

        hatOlustur(state.hatBaslangicDirek, direkData);
    }
}

async function hatOlustur(direk1, direk2) {
    const mesafe = state.map.distance([direk1.lat, direk1.lng], [direk2.lat, direk2.lng]);

    const iletkenTipi = prompt('İletken Tipi (örn: AAC, AAAC, ACSR):', 'AAC') || 'AAC';
    const iletkenCinsi = prompt('İletken Cinsi (örn: Bölünmüş, Tekli):', 'Bölünmüş') || 'Bölünmüş';
    const kesit = parseFloat(prompt('Kesit (mm²):', '95')) || 95;

    try {
        const res = await api('/direkler/hat', {
            method: 'POST',
            body: JSON.stringify({
                proje_id: parseInt(state.currentProject),
                direk1_id: direk1.id,
                direk2_id: direk2.id,
                iletken_tipi: iletkenTipi,
                iletken_cinsi: iletkenCinsi,
                kesit_mm2: kesit,
                mesafe_metre: mesafe
            })
        });

        if (res.error) {
            showNotification('Hata: ' + res.error, 'error');
            return;
        }

        const hatLine = L.polyline(
            [[direk1.lat, direk1.lng], [direk2.lat, direk2.lng]],
            {
                color: getIletkenRenk(iletkenTipi),
                weight: 3,
                opacity: 0.8
            }
        ).addTo(state.map);

        hatLine.bindPopup(`
            <b>Hat Bilgisi</b><br>
            ${direk1.numara} → ${direk2.numara}<br>
            İletken: ${iletkenTipi} ${iletkenCinsi}<br>
            Kesit: ${kesit} mm²<br>
            Mesafe: ${mesafe.toFixed(2)} m
        `);

        state.polylines.push(hatLine);

        showNotification('Hat oluşturuldu', 'success');

    } catch (err) {
        console.error('Hat oluşturma hatası:', err);
        showNotification('Hat oluşturulamadı', 'error');
    }

    hatCizimModuKapat();
}

function hatCizimModuKapat() {
    state.hatCizimModu = false;
    state.hatBaslangicDirek = null;

    state.markers.forEach(m => {
        m.marker.off('click', hatDirekSec);
    });

    loadDirekler(state.currentProject);
}

// ---- Otomatik Hat (En Yakın Komşu) ----

export async function otomatikHatOlustur() {
    if (!state.currentProject) {
        alert('Önce proje seçin!');
        return;
    }

    const direkler = await api(`/direkler/proje/${state.currentProject}`);
    if (direkler.length < 2) {
        alert('En az 2 direk gerekli!');
        return;
    }

    const iletkenTipi = prompt('İletken Tipi:', 'AAC') || 'AAC';
    const iletkenCinsi = prompt('İletken Cinsi:', 'Bölünmüş') || 'Bölünmüş';
    const kesit = parseFloat(prompt('Kesit (mm²):', '95')) || 95;

    const ziyaretEdildi = new Set();
    const rota = [];
    let mevcut = direkler[0];
    rota.push(mevcut);
    ziyaretEdildi.add(mevcut.id);

    while (ziyaretEdildi.size < direkler.length) {
        let enYakin = null;
        let minMesafe = Infinity;

        direkler.forEach(d => {
            if (!ziyaretEdildi.has(d.id)) {
                const mesafe = state.map.distance([mevcut.lat, mevcut.lng], [d.lat, d.lng]);
                if (mesafe < minMesafe) {
                    minMesafe = mesafe;
                    enYakin = d;
                }
            }
        });

        if (enYakin) {
            await api('/direkler/hat', {
                method: 'POST',
                body: JSON.stringify({
                    proje_id: parseInt(state.currentProject),
                    direk1_id: mevcut.id,
                    direk2_id: enYakin.id,
                    iletken_tipi: iletkenTipi,
                    iletken_cinsi: iletkenCinsi,
                    kesit_mm2: kesit,
                    mesafe_metre: minMesafe
                })
            });

            rota.push(enYakin);
            ziyaretEdildi.add(enYakin.id);
            mevcut = enYakin;
        }
    }

    hatlariYukle();

    let toplamMesafe = 0;
    for (let i = 0; i < rota.length - 1; i++) {
        toplamMesafe += state.map.distance([rota[i].lat, rota[i].lng], [rota[i + 1].lat, rota[i + 1].lng]);
    }

    showNotification(`Otomatik hat: ${rota.length} direk, ${(toplamMesafe / 1000).toFixed(2)} km`, 'success');
}

// ---- Hatları Veritabanından Yükleme ----

export async function hatlariYukle() {
    if (!state.currentProject) return;

    const hatlar = await api(`/direkler/proje/${state.currentProject}/hatlar`);

    state.polylines.forEach(p => state.map.removeLayer(p));
    state.polylines = [];

    // Hat etiketlerini temizle
    if (!state.hatLabels) state.hatLabels = [];
    state.hatLabels.forEach(l => state.map.removeLayer(l));
    state.hatLabels = [];

    let toplamMesafe = 0;

    hatlar.forEach(h => {
        const mesafe = h.mesafe_metre || 0;
        toplamMesafe += mesafe;

        const hatLine = L.polyline(
            [[h.direk1_lat, h.direk1_lng], [h.direk2_lat, h.direk2_lng]],
            {
                color: getIletkenRenk(h.iletken_tipi),
                weight: 3,
                opacity: 0.8
            }
        ).addTo(state.map);

        hatLine.bindPopup(`
            <div style="font-family: 'Inter', 'Segoe UI', sans-serif; min-width: 220px;">
                <b>${h.direk1_numara} → ${h.direk2_numara}</b><br>
                <table style="width: 100%; font-size: 12px; margin: 8px 0;">
                    <tr><td>İletken:</td><td><b>${h.iletken_tipi || '-'}</b> ${h.iletken_cinsi || ''}</td></tr>
                    <tr><td>Kesit:</td><td>${h.kesit_mm2 || '-'} mm²</td></tr>
                    <tr><td>Mesafe:</td><td>${mesafe ? mesafe.toFixed(2) + ' m' : '-'}</td></tr>
                </table>
                <div style="display: flex; gap: 5px;">
                    <button class="hat-popup-btn hat-popup-edit" data-hat-id="${h.id}" style="flex:1; background: #3b82f6; color: white; border: none; padding: 6px; border-radius: 4px; cursor: pointer;">Düzenle</button>
                    <button class="hat-popup-btn hat-popup-delete" data-hat-id="${h.id}" style="flex:1; background: #ef4444; color: white; border: none; padding: 6px; border-radius: 4px; cursor: pointer;">Sil</button>
                </div>
            </div>
        `);

        hatLine.on('popupopen', (e) => {
            const container = e.popup.getElement();
            if (container) {
                L.DomEvent.disableClickPropagation(container);
                const editBtn = container.querySelector('.hat-popup-edit');
                const deleteBtn = container.querySelector('.hat-popup-delete');
                if (editBtn) {
                    editBtn.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        hatDuzenleModal(parseInt(editBtn.dataset.hatId));
                    });
                }
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        hatSil(parseInt(deleteBtn.dataset.hatId));
                    });
                }
            }
        });

        state.polylines.push(hatLine);

        // --- Hat etiket (mesafe + iletken) ---
        const midLat = (h.direk1_lat + h.direk2_lat) / 2;
        const midLng = (h.direk1_lng + h.direk2_lng) / 2;
        const iletkenAdi = h.iletken_tipi || '';
        const mesafeStr = mesafe ? mesafe.toFixed(1) + 'm' : '';

        if (mesafeStr || iletkenAdi) {
            const labelIcon = L.divIcon({
                className: 'hat-label',
                html: `<div class="hat-label-content">
                    ${iletkenAdi ? `<span class="hat-label-iletken">${iletkenAdi}</span>` : ''}
                    ${mesafeStr ? `<span class="hat-label-mesafe">${mesafeStr}</span>` : ''}
                </div>`,
                iconSize: [80, 30],
                iconAnchor: [40, 15]
            });

            const label = L.marker([midLat, midLng], {
                icon: labelIcon,
                interactive: false,
                zIndexOffset: -1000
            }).addTo(state.map);

            state.hatLabels.push(label);
        }
    });

    document.getElementById('toplamMesafe').textContent = (toplamMesafe / 1000).toFixed(2);
}

// ---- Hat Sil ----

export async function hatSil(hatId) {
    console.log('hatSil çağrıldı, ID:', hatId);
    state.map.closePopup();

    try {
        await api(`/direkler/hat/${hatId}`, { method: 'DELETE' });
        showNotification('Hat silindi', 'success');
        hatlariYukle();
    } catch (err) {
        console.error('Hat silme hatası:', err);
        showNotification('Hat silinemedi', 'error');
    }
}

// ---- Hat Düzenleme Modalı ----

export async function hatDuzenleModal(hatId) {
    state.map.closePopup();

    const iletkenler = await api('/tipler/iletken');
    const hatlar = await api(`/direkler/proje/${state.currentProject}/hatlar`);
    const hat = hatlar.find(h => h.id === hatId);
    if (!hat) return;

    const iletkenSecenekler = iletkenler.map(i =>
        `<option value="${i.kod}" ${hat.iletken_tipi === i.kod ? 'selected' : ''}>${i.kod} - ${i.ad}</option>`
    ).join('');

    const kesitler = [25, 35, 50, 70, 95, 120, 150, 185, 240, 300];
    const kesitSecenekler = kesitler.map(k =>
        `<option value="${k}" ${hat.kesit_mm2 == k ? 'selected' : ''}>${k} mm²</option>`
    ).join('');

    const html = `
    <div class="modal" id="hatDuzenleModal" style="display: flex;">
        <div class="modal-content" style="max-width: 420px;">
            <div class="modal-header">
                <h2>Hat Düzenle</h2>
                <button class="close-btn" onclick="document.getElementById('hatDuzenleModal').remove()">&times;</button>
            </div>

            <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; margin-bottom: 15px; font-size: 13px;">
                <b>${hat.direk1_numara} → ${hat.direk2_numara}</b><br>
                Mesafe: ${hat.mesafe_metre ? hat.mesafe_metre.toFixed(2) + ' m' : '-'}
            </div>

            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">İletken Tipi</label>
                <select id="hatEditIletkenTipi" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
                    ${iletkenSecenekler}
                </select>
            </div>

            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">İletken Cinsi</label>
                <select id="hatEditIletkenCinsi" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
                    <option value="Tekli" ${hat.iletken_cinsi === 'Tekli' ? 'selected' : ''}>Tekli İletken</option>
                    <option value="Bölünmüş" ${hat.iletken_cinsi === 'Bölünmüş' ? 'selected' : ''}>Bölünmüş (Bundle)</option>
                    <option value="3x1" ${hat.iletken_cinsi === '3x1' ? 'selected' : ''}>3x1 Faz</option>
                    <option value="3x3" ${hat.iletken_cinsi === '3x3' ? 'selected' : ''}>3x3 Faz + Nötr</option>
                </select>
            </div>

            <div class="form-group" style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Kesit (mm²)</label>
                <select id="hatEditKesit" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
                    ${kesitSecenekler}
                </select>
            </div>

            <div style="display: flex; gap: 10px;">
                <button onclick="hatGuncelle(${hatId})" style="flex:1; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">Kaydet</button>
                <button onclick="document.getElementById('hatDuzenleModal').remove()" style="flex:1; padding: 12px; background: #64748b; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">İptal</button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
}

export async function hatGuncelle(hatId) {
    const iletken_tipi = document.getElementById('hatEditIletkenTipi').value;
    const iletken_cinsi = document.getElementById('hatEditIletkenCinsi').value;
    const kesit_mm2 = parseFloat(document.getElementById('hatEditKesit').value);

    try {
        const res = await api(`/direkler/hat/${hatId}`, {
            method: 'PUT',
            body: JSON.stringify({ iletken_tipi, iletken_cinsi, kesit_mm2 })
        });

        if (res.error) {
            showNotification('Hata: ' + res.error, 'error');
            return;
        }

        document.getElementById('hatDuzenleModal').remove();
        showNotification('Hat güncellendi', 'success');
        hatlariYukle();
    } catch (err) {
        console.error('Hat güncelleme hatası:', err);
        showNotification('Hat güncellenemedi', 'error');
    }
}

// ============================================
// ZİNCİRLEME HAT ÇİZİM MODU
// ============================================

export async function zincirlemeHatModuBaslat() {
    if (!state.currentProject) {
        alert('Önce proje seçin!');
        return;
    }

    const iletkenler = await api('/tipler/iletken');

    let secenekler = iletkenler.map(i =>
        `<option value="${i.kod}" data-renk="${i.renk}">${i.kod} - ${i.ad}</option>`
    ).join('');

    const html = `
    <div class="modal" id="iletkenModal" style="display: flex;">
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h2>Hat Çizim - İletken Seçimi</h2>
                <button class="close-btn" onclick="document.getElementById('iletkenModal').remove()">&times;</button>
            </div>

            <div class="form-group">
                <label>İletken Tipi</label>
                <select id="secimIletkenTipi" style="width: 100%; padding: 10px; margin-bottom: 15px;">
                    ${secenekler}
                </select>
            </div>

            <div class="form-group">
                <label>İletken Cinsi</label>
                <select id="secimIletkenCinsi" style="width: 100%; padding: 10px; margin-bottom: 15px;">
                    <option value="Tekli">Tekli İletken</option>
                    <option value="Bölünmüş">Bölünmüş (Bundle)</option>
                    <option value="3x1">3x1 Faz</option>
                    <option value="3x3">3x3 Faz + Nötr</option>
                </select>
            </div>

            <div class="form-group">
                <label>Kesit (mm²)</label>
                <select id="secimKesit" style="width: 100%; padding: 10px; margin-bottom: 15px;">
                    <option value="25">25 mm²</option>
                    <option value="35">35 mm²</option>
                    <option value="50">50 mm²</option>
                    <option value="70">70 mm²</option>
                    <option value="95" selected>95 mm²</option>
                    <option value="120">120 mm²</option>
                    <option value="150">150 mm²</option>
                    <option value="185">185 mm²</option>
                    <option value="240">240 mm²</option>
                    <option value="300">300 mm²</option>
                </select>
            </div>

            <div style="background: #f1f5f9; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 12px;">
                <b>Nasıl kullanılır?</b><br>
                1. Başlangıç direğine tıklayın<br>
                2. Sıradaki direğe tıklayın (hat otomatik çizilir)<br>
                3. Zinciri devam ettirin...<br>
                4. ESC tuşu ile bitirin
            </div>

            <button class="btn btn-success" onclick="zincirlemeBaslat()">Hat Çizimine Başla</button>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
}

export function zincirlemeBaslat() {
    const iletkenTipi = document.getElementById('secimIletkenTipi').value;
    const iletkenCinsi = document.getElementById('secimIletkenCinsi').value;
    const kesit = document.getElementById('secimKesit').value;

    state.seciliIletken = {
        tip: iletkenTipi,
        cinsi: iletkenCinsi,
        kesit: parseFloat(kesit),
        renk: document.getElementById('secimIletkenTipi').selectedOptions[0].dataset.renk
    };

    document.getElementById('iletkenModal').remove();

    state.zincirlemeHatModu = true;
    state.zincirlemeSonDirek = null;
    state.zincirlemeHatlar = [];

    setTool('zincirleme');
    showNotification('Zincirleme hat modu: İlk direğe tıklayın (ESC ile bitir)', 'success');

    state.markers.forEach(m => {
        m.marker.off('click');
        m.marker.on('click', zincirlemeDirekSec);
        m.marker.setOpacity(1);
    });
}

function zincirlemeDirekSec(e) {
    if (!state.zincirlemeHatModu) return;

    const clickedMarker = e.target;
    const direkData = state.markers.find(m => m.marker === clickedMarker).data;

    if (!state.zincirlemeSonDirek) {
        state.zincirlemeSonDirek = direkData;

        clickedMarker.setIcon(L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="direk-marker" style="background-color: #10b981; box-shadow: 0 0 0 4px #10b981, 0 0 20px #10b981; animation: pulse 1s infinite;">${direkData.numara.slice(-2)}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        }));

        showNotification(`Başlangıç: ${direkData.numara} - Sonraki direğe tıklayın`, 'info');

    } else {
        if (state.zincirlemeSonDirek.id === direkData.id) {
            showNotification('Aynı direk seçilemez!', 'error');
            return;
        }

        zincirlemeHatCiz(state.zincirlemeSonDirek, direkData);

        const oncekiDirek = state.zincirlemeSonDirek;
        state.zincirlemeSonDirek = direkData;

        const oncekiMarker = state.markers.find(m => m.data.id === oncekiDirek.id);
        if (oncekiMarker) {
            oncekiMarker.marker.setIcon(L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="direk-marker" style="background-color: ${oncekiDirek.renk || '#3b82f6'};">${oncekiDirek.numara.slice(-2)}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            }));
        }

        clickedMarker.setIcon(L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="direk-marker" style="background-color: #10b981; box-shadow: 0 0 0 4px #10b981, 0 0 20px #10b981; animation: pulse 1s infinite;">${direkData.numara.slice(-2)}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        }));

        showNotification(`${oncekiDirek.numara} → ${direkData.numara} hattı çizildi. Devam edin...`, 'success');
    }
}

async function zincirlemeHatCiz(direk1, direk2) {
    const mesafe = state.map.distance([direk1.lat, direk1.lng], [direk2.lat, direk2.lng]);

    try {
        const res = await api('/direkler/hat', {
            method: 'POST',
            body: JSON.stringify({
                proje_id: parseInt(state.currentProject),
                direk1_id: direk1.id,
                direk2_id: direk2.id,
                iletken_tipi: state.seciliIletken.tip,
                iletken_cinsi: state.seciliIletken.cinsi,
                kesit_mm2: state.seciliIletken.kesit,
                mesafe_metre: mesafe
            })
        });

        const hatLine = L.polyline(
            [[direk1.lat, direk1.lng], [direk2.lat, direk2.lng]],
            {
                color: state.seciliIletken.renk,
                weight: 4,
                opacity: 0.9,
                smoothFactor: 1
            }
        ).addTo(state.map);

        const okIkon = L.divIcon({
            className: 'hat-ok',
            html: `<div style="color: ${state.seciliIletken.renk}; font-size: 14px; font-weight: bold;">➤</div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        const ortaNokta = [
            (direk1.lat + direk2.lat) / 2,
            (direk1.lng + direk2.lng) / 2
        ];

        const okMarker = L.marker(ortaNokta, { icon: okIkon }).addTo(state.map);

        hatLine.bindPopup(`
        <div style="font-family: 'Segoe UI', sans-serif; min-width: 200px;">
            <h4 style="margin: 0 0 10px 0; color: ${state.seciliIletken.renk};">Hat Bilgisi</h4>
            <table style="width: 100%; font-size: 12px;">
                <tr><td><b>Baslangic:</b></td><td>${direk1.numara}</td></tr>
                <tr><td><b>Bitis:</b></td><td>${direk2.numara}</td></tr>
                <tr><td><b>Iletken:</b></td><td>${state.seciliIletken.tip} ${state.seciliIletken.cinsi}</td></tr>
                <tr><td><b>Kesit:</b></td><td>${state.seciliIletken.kesit} mm2</td></tr>
                <tr><td><b>Mesafe:</b></td><td>${mesafe.toFixed(2)} m</td></tr>
            </table>
            <button onclick="hatSil(${res.id})" style="margin-top: 10px; background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; width: 100%;">Sil</button>
        </div>
        `);

        state.zincirlemeHatlar.push({ line: hatLine, ok: okMarker, id: res.id });
        state.polylines.push(hatLine);

    } catch (err) {
        console.error('Hat cizim hatasi:', err);
        showNotification('Hat kaydedilemedi', 'error');
    }
}

export function zincirlemeModuKapat() {
    if (!state.zincirlemeHatModu) return;

    state.zincirlemeHatModu = false;

    if (state.zincirlemeSonDirek) {
        const sonMarker = state.markers.find(m => m.data.id === state.zincirlemeSonDirek.id);
        if (sonMarker) {
            sonMarker.marker.setIcon(L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="direk-marker" style="background-color: ${state.zincirlemeSonDirek.renk || '#3b82f6'};">${state.zincirlemeSonDirek.numara.slice(-2)}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            }));
        }
    }

    state.zincirlemeSonDirek = null;
    state.seciliIletken = null;

    state.markers.forEach(m => {
        m.marker.off('click', zincirlemeDirekSec);
        m.marker.on('click', () => direkSec(m.data, m.marker));
    });

    setTool('select');
    showNotification(`Zincirleme hat modu kapandi. ${state.zincirlemeHatlar.length} hat cizildi.`, 'success');
}
