// ============================================
// DİREK CRUD & MALZEME & ARAMA
// ============================================
import { state } from './state.js';
import { api } from './api.js';
import { showNotification, kapatModal } from './ui.js';

// ---- Proje Yönetimi ----

export async function loadProjeler() {
    const projeler = await api('/projeler');
    const select = document.getElementById('projeSelect');
    select.innerHTML = '<option value="">Proje seçin...</option>';

    projeler.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = p.ad;
        select.appendChild(option);
    });
}

export async function projeDegistir() {
    const projeId = document.getElementById('projeSelect').value;
    if (!projeId) {
        state.currentProject = null;
        document.getElementById('currentProjectName').textContent = 'Proje seçilmedi';
        state.markers.forEach(m => state.map.removeLayer(m.marker));
        state.markers = [];
        return;
    }

    state.currentProject = projeId;
    const projeler = await api('/projeler');
    const proje = projeler.find(p => p.id == projeId);
    document.getElementById('currentProjectName').textContent = proje.ad;

    loadDirekler(projeId);
}

export async function projeOlustur() {
    const ad = document.getElementById('yeniProjeAd').value.trim();
    const aciklama = document.getElementById('yeniProjeAciklama').value.trim();

    if (!ad) {
        alert('Proje adı gerekli!');
        return;
    }

    const res = await api('/projeler', {
        method: 'POST',
        body: JSON.stringify({ ad, aciklama })
    });

    kapatModal();
    await loadProjeler();

    document.getElementById('projeSelect').value = res.id;
    projeDegistir();
    showNotification('Proje oluşturuldu: ' + ad, 'success');
}

// ---- Dropdown Data ----

export let allTipler = [];

export async function loadTipler() {
    allTipler = await api('/tipler');
    updateTipDropdown('direkCinsi', 'direkTipi');
    if (state.selectedDirek) updateTipDropdown('editCins', 'editTip', state.selectedDirek.tip_id);
}

export function updateTipDropdown(cinsIdElement, tipIdElement, selectedTipId = null) {
    const cinsEl = document.getElementById(cinsIdElement);
    if (!cinsEl) return;

    const cins_id = cinsEl.value;
    const select = document.getElementById(tipIdElement);
    if (!select) return;

    select.innerHTML = '';
    if (!cins_id) return;

    const filtered = allTipler.filter(t => t.cins_id == cins_id);
    filtered.forEach(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = t.ad;
        option.dataset.renk = t.renk;
        select.appendChild(option);
    });

    if (selectedTipId) {
        select.value = selectedTipId;
    }
}

export async function loadCinsler() {
    const cinsler = await api('/tipler/cins');

    ['direkCinsi', 'editCins'].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = '';
        cinsler.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.ad;
            select.appendChild(option);
        });

        // Cins değiştiğinde tipleri güncelle (event listener)
        select.addEventListener('change', () => {
            if (id === 'direkCinsi') updateTipDropdown('direkCinsi', 'direkTipi');
            if (id === 'editCins') updateTipDropdown('editCins', 'editTip');
        });

        // Tıklamadan önce mevcut seçime göre de doldur
        if (id === 'direkCinsi') updateTipDropdown('direkCinsi', 'direkTipi');
        if (id === 'editCins' && window.state && window.state.selectedDirek) {
            updateTipDropdown('editCins', 'editTip', window.state.selectedDirek.tip_id);
        }
    });
}

export async function loadMalzemeler() {
    // Artık yeni malzeme ekleme penceresi kullanılıyor
    // Bu fonksiyon geriye uyumluluk için korunuyor
}

// ---- Otomatik Numara ----

export async function sonrakiNumarayiBul() {
    const direkler = await api(`/direkler/proje/${state.currentProject}`);

    if (direkler.length === 0) {
        return 'D-001';
    }

    let maxNum = 0;
    let prefix = 'D-';

    direkler.forEach(d => {
        const match = d.numara.match(/^([A-Za-z-]*)(\d+)$/);
        if (match) {
            prefix = match[1] || 'D-';
            const num = parseInt(match[2]);
            if (num > maxNum) maxNum = num;
        }
    });

    const nextNum = (maxNum + 1).toString().padStart(3, '0');
    return prefix + nextNum;
}

// ---- Direk Yükleme ----

// hatlariYukle dışarıdan inject edilir (circular dependency önlemi)
let _hatlariYukleFn = null;
export function setHatlariYukleFn(fn) { _hatlariYukleFn = fn; }

export async function loadDirekler(projeId) {
    state.markers.forEach(m => state.map.removeLayer(m.marker));
    state.markers = [];
    state.polylines.forEach(p => state.map.removeLayer(p));
    state.polylines = [];

    const direkler = await api(`/direkler/proje/${projeId}`);

    document.getElementById('toplamDirek').textContent = direkler.length;

    const list = document.getElementById('direkList');
    list.innerHTML = '';

    const sortedDirekler = [...direkler].sort((a, b) => a.numara.localeCompare(b.numara));

    sortedDirekler.forEach((d, index) => {
        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="direk-marker" style="background-color: ${d.renk || '#3b82f6'};" data-id="${d.id}">${d.tip_adi}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const marker = L.marker([d.lat, d.lng], {
            icon: customIcon,
            draggable: true
        }).addTo(state.map);

        marker.bindTooltip(`
            <div style="text-align: center; min-width: 90px;">
                <div style="font-weight: 700; font-size: 13px; margin-bottom: 3px;">${d.numara}</div>
                <div style="font-size: 11px; color: #64748b;">${d.tip_adi}</div>
                <div style="font-size: 10px; color: ${d.renk || '#3b82f6'}; font-weight: 600;">${d.cins_adi}</div>
            </div>
        `, {
            direction: 'top',
            offset: [0, -10],
            className: 'direk-tooltip'
        });

        // Contextual Popup for Direct Actions
        const popupContent = document.createElement('div');
        popupContent.style.textAlign = 'center';
        popupContent.innerHTML = `
            <strong style="display:block; margin-bottom: 5px; font-size: 14px; color: var(--text-primary);">${d.numara}</strong>
            <span style="font-size: 11px; color: var(--text-secondary);">${d.cins_adi} - ${d.tip_adi}</span>
            <div class="contextual-actions">
                <button class="context-btn" onclick="window.direkSecById(${d.id})" title="Düzenle / Detaylar">✏️</button>
                <button class="context-btn" onclick="window.direkSecById(${d.id}); setTimeout(() => { window.document.querySelector('[data-action=\\'malzemeEklePenceresiAc\\']').click(); }, 150);" title="Malzeme Ekle">📦</button>
                <button class="context-btn danger" onclick="if(confirm('Direği silmek istediğinize emin misiniz?')) { window.direkSilEvent(${d.id}); }" title="Sil">🗑️</button>
            </div>
        `;

        marker.bindPopup(popupContent, {
            closeButton: false,
            className: 'glass-popup',
            offset: [0, -15]
        });

        marker.on('dragend', async (e) => {
            const newLat = e.target.getLatLng().lat;
            const newLng = e.target.getLatLng().lng;
            await direkTasi(d.id, newLat, newLng);
        });

        state.markers.push({ marker, data: d });

        const item = document.createElement('div');
        item.className = 'direk-item';
        item.dataset.id = d.id;
        item.innerHTML = `
            <div class="direk-info">
                <div class="direk-numara">${d.numara}</div>
                <div class="direk-detay">${d.tip_adi} | ${d.cins_adi}</div>
            </div>
            <div class="direk-actions">
                <button class="icon-btn" onclick="event.stopPropagation(); direkSecById(${d.id})" title="Düzenle">✏️</button>
            </div>
        `;
        item.onclick = () => {
            state.map.panTo([d.lat, d.lng]);
            direkSec(d, marker);
        };
        list.appendChild(item);
    });

    if (direkler.length > 0) {
        const group = new L.featureGroup(state.markers.map(m => m.marker));
        state.map.fitBounds(group.getBounds().pad(0.1));
    }

    // Hatları veritabanından yükle
    if (_hatlariYukleFn) await _hatlariYukleFn();
}

// ---- Direk Seçme ----

export function direkSec(direk, marker) {
    state.selectedDirek = direk;

    document.querySelectorAll('.direk-item').forEach(el => {
        el.classList.remove('active');
        if (parseInt(el.dataset.id) === direk.id) {
            el.classList.add('active');
        }
    });

    state.markers.forEach(m => {
        const el = m.marker.getElement();
        if (el) {
            const dMarker = el.querySelector('.direk-marker');
            if (dMarker) dMarker.classList.remove('selected');
        }
    });

    const markerEl = marker.getElement();
    if (markerEl) {
        const dMarker = markerEl.querySelector('.direk-marker');
        if (dMarker) dMarker.classList.add('selected');
    }

    document.getElementById('editNumara').value = direk.numara || '';
    document.getElementById('editCins').value = direk.cins_id || '';
    updateTipDropdown('editCins', 'editTip', direk.tip_id);
    const durEl = document.getElementById('editDurum'); if (durEl) durEl.value = direk.durum || 'MEVCUT';
    document.getElementById('editLat').value = direk.lat || '';
    document.getElementById('editLng').value = direk.lng || '';

    const editAciklama = document.getElementById('editAciklama');
    if (editAciklama) editAciklama.value = direk.aciklama || '';

    const fotoOnizleme = document.getElementById('fotoOnizleme');
    if (fotoOnizleme) {
        if (direk.foto_yolu) {
            fotoOnizleme.innerHTML = `<img src="${direk.foto_yolu}" class="foto-thumb" onclick="window._openLightbox('${direk.foto_yolu}')">`;
        } else {
            fotoOnizleme.innerHTML = '<div style="color: #94a3b8; font-size: 12px; padding: 10px; background: #1e293b; border-radius: 4px;">Fotoğraf yok</div>';
        }
    }

    document.getElementById('direkDetaySection').style.display = 'block';

    loadDirekMalzemeler(direk.id);

    document.getElementById('direkDetaySection').scrollIntoView({ behavior: 'smooth' });
}

export function direkSecById(id) {
    const found = state.markers.find(m => m.data.id === id);
    if (found) direkSec(found.data, found.marker);
}

// ---- Direk Taşıma ----

export async function direkTasi(direkId, lat, lng) {
    const direkData = state.selectedDirek || state.markers.find(m => m.data.id === direkId).data;

    await api(`/direkler/${direkId}`, {
        method: 'PUT',
        body: JSON.stringify({
            tip_id: direkData.tip_id,
            cins_id: direkData.cins_id,
            numara: direkData.numara,
            lat, lng
        })
    });
    loadDirekler(state.currentProject);
    showNotification('Direk yeni konuma taşındı', 'success');
}

// ---- Hızlı Ekleme (Haritadan) ----

export async function hizliDirekEkle(lat, lng) {
    if (!state.currentProject) {
        alert('Önce bir proje seçin!');
        // setTool inline
        state.currentTool = 'select';
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        const sb = document.getElementById('toolSelect'); if (sb) sb.classList.add('active');
        document.getElementById('map').style.cursor = 'default';
        return;
    }

    const tip_id = document.getElementById('direkTipi').value || 1;
    const cins_id = document.getElementById('direkCinsi').value || 1;
    const numara = await sonrakiNumarayiBul();

    try {
        const res = await api('/direkler', {
            method: 'POST',
            body: JSON.stringify({
                proje_id: parseInt(state.currentProject),
                tip_id: parseInt(tip_id),
                cins_id: parseInt(cins_id),
                numara,
                lat,
                lng,
                aciklama: ''
            })
        });

        if (res.error) {
            alert('Hata: ' + res.error);
            return;
        }

        await loadDirekler(state.currentProject);

        setTimeout(() => {
            const yeniDirek = state.markers.find(m => m.data.numara === numara);
            if (yeniDirek) {
                direkSec(yeniDirek.data, yeniDirek.marker);
                state.map.panTo([lat, lng]);
            }
        }, 100);

        showNotification(`Direk eklendi: ${numara} - Düzenlemek için tıklayın`, 'success');

    } catch (err) {
        console.error('Hızlı ekleme hatası:', err);
        alert('Direk eklenirken hata oluştu!');
    }
}

// ---- Direk CRUD ----

export async function direkEkle() {
    if (!state.currentProject) {
        alert('Önce bir proje seçin!');
        return;
    }

    let numara = document.getElementById('direkNumara').value.trim();
    const cins_id = document.getElementById('direkCinsi').value;
    const tip_id = document.getElementById('direkTipi').value;
    const lat = parseFloat(document.getElementById('direkLat').value);
    const lng = parseFloat(document.getElementById('direkLng').value);
    const durumEl = document.getElementById('direkDurum');
    const durum = durumEl ? durumEl.value : 'MEVCUT';

    if (!numara) {
        numara = await sonrakiNumarayiBul();
        document.getElementById('direkNumara').value = numara;
    }

    if (!tip_id) { alert('Direk tipi seçin!'); return; }
    if (!cins_id) { alert('Direk cinsi seçin!'); return; }
    if (isNaN(lat) || isNaN(lng)) { alert('Geçerli koordinatlar girin!'); return; }

    try {
        const res = await api('/direkler', {
            method: 'POST',
            body: JSON.stringify({
                proje_id: parseInt(state.currentProject),
                tip_id: parseInt(tip_id),
                cins_id: parseInt(cins_id),
                numara, lat, lng, durum,
                aciklama: ''
            })
        });

        if (res.error) { alert('Hata: ' + res.error); return; }

        document.getElementById('direkNumara').value = '';
        document.getElementById('direkLat').value = '';
        document.getElementById('direkLng').value = '';

        await loadDirekler(state.currentProject);

        setTimeout(() => {
            const yeniDirek = state.markers.find(m => m.data.numara === numara);
            if (yeniDirek) direkSec(yeniDirek.data, yeniDirek.marker);
        }, 100);

        showNotification('Direk eklendi: ' + numara, 'success');

    } catch (err) {
        console.error('Direk ekleme hatası:', err);
        alert('Direk eklenirken hata oluştu!');
    }
}

export async function direkGuncelle() {
    if (!state.selectedDirek) return;

    const numara = document.getElementById('editNumara').value;
    const cins_id = document.getElementById('editCins').value;
    const tip_id = document.getElementById('editTip').value;
    const lat = parseFloat(document.getElementById('editLat').value);
    const lng = parseFloat(document.getElementById('editLng').value);
    const durumEl = document.getElementById('editDurum');
    const durum = durumEl ? durumEl.value : 'MEVCUT';

    if (!numara) { alert('Numara boş bırakılamaz!'); return; }

    await api(`/direkler/${state.selectedDirek.id}`, {
        method: 'PUT',
        body: JSON.stringify({ tip_id, cins_id, numara, lat, lng, durum })
    });

    loadDirekler(state.currentProject);
    showNotification('Direk güncellendi', 'success');
}

export async function direkSil() {
    if (!state.selectedDirek) return;
    if (!confirm(`"${state.selectedDirek.numara}" numaralı direği silmek istediğinize emin misiniz?`)) return;

    await api(`/direkler/${state.selectedDirek.id}`, { method: 'DELETE' });

    document.getElementById('direkDetaySection').style.display = 'none';
    state.selectedDirek = null;
    loadDirekler(state.currentProject);
    showNotification('Direk silindi', 'success');
}

// ---- Açıklama & Fotoğraf ----

export async function aciklamaKaydet() {
    if (!state.selectedDirek) {
        alert('Önce bir direk seçin!');
        return;
    }

    const editAciklama = document.getElementById('editAciklama');
    if (!editAciklama) return;

    const aciklama = editAciklama.value;

    try {
        const res = await api(`/direkler/${state.selectedDirek.id}/aciklama`, {
            method: 'PUT',
            body: JSON.stringify({ aciklama })
        });

        if (res.error) {
            showNotification('Hata: ' + res.error, 'error');
            return;
        }

        state.selectedDirek.aciklama = aciklama;
        showNotification('Açıklama kaydedildi', 'success');

    } catch (err) {
        console.error('Açıklama kaydetme hatası:', err);
        showNotification('Açıklama kaydedilemedi', 'error');
    }
}

export async function fotoYukle(input) {
    if (!state.selectedDirek) {
        alert('Önce bir direk seçin!');
        input.value = '';
        return;
    }

    if (!input.files || !input.files[0]) return;

    const file = input.files[0];

    if (file.size > 5 * 1024 * 1024) {
        alert('Dosya boyutu 5MB\'dan küçük olmalı!');
        input.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('foto', file);

    try {
        showNotification('Fotoğraf yükleniyor...', 'info');

        const res = await fetch(`${state.API_URL}/direkler/${state.selectedDirek.id}/foto`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + state.token
            },
            body: formData
        });

        const data = await res.json();

        if (data.error) {
            showNotification('Hata: ' + data.error, 'error');
            return;
        }

        const fotoOnizleme = document.getElementById('fotoOnizleme');
        if (fotoOnizleme && data.foto_yolu) {
            fotoOnizleme.innerHTML =
                `<img src="${data.foto_yolu}" class="foto-thumb" onclick="window._openLightbox('${data.foto_yolu}')">`;
            state.selectedDirek.foto_yolu = data.foto_yolu;
        }

        showNotification('Fotoğraf yüklendi', 'success');

    } catch (err) {
        console.error('Fotoğraf yükleme hatası:', err);
        showNotification('Fotoğraf yüklenemedi', 'error');
    } finally {
        input.value = '';
    }
}

// ---- Malzeme İşlemleri ----

export async function loadDirekMalzemeler(direkId) {
    const malzemeler = await api(`/direkler/${direkId}/malzemeler`);
    const list = document.getElementById('malzemeList');
    list.innerHTML = '';

    if (malzemeler.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px;">Henüz malzeme eklenmemiş</div>';
        return;
    }

    malzemeler.forEach(m => {
        const item = document.createElement('div');
        item.className = 'malzeme-item';
        item.innerHTML = `
            <div>
                <strong>${m.malzeme_cinsi_adi}</strong><br>
                <small>${m.malzeme_tipi_adi}</small>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: bold; color: #3b82f6;">${m.miktar} ${m.birim}</div>
                <div style="font-size: 10px; color: #94a3b8;">${m.durum || 'M+M'}</div>
                <button onclick="malzemeSil(${m.id})" style="background: #ef4444; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-top: 5px;">Sil</button>
            </div>
        `;
        list.appendChild(item);
    });
}

export async function malzemeEkle() {
    // Yeni modal pencere ile malzeme eklenir
    // Bu fonksiyon artık malzemeEklePenceresiAc() olarak çalışır
    if (window._malzemeEklePenceresiAc) {
        window._malzemeEklePenceresiAc();
    }
}

export async function malzemeSil(malzemeId) {
    await api(`/direkler/${state.selectedDirek.id}/malzemeler/${malzemeId}`, { method: 'DELETE' });
    loadDirekMalzemeler(state.selectedDirek.id);
    showNotification('Malzeme silindi', 'success');
}

// ---- Arama ----

export function direkAraKeyup(e) {
    if (e.key === 'Enter') {
        direkAraBtn();
    }
}

export async function direkAraBtn() {
    if (!state.currentProject) {
        alert('Önce proje seçin!');
        return;
    }

    const q = document.getElementById('direkAraInput').value.trim();
    if (!q) return;

    const sonuclar = await api(`/direkler/ara/${state.currentProject}?q=${encodeURIComponent(q)}`);

    if (sonuclar.length === 0) {
        showNotification('Direk bulunamadı', 'error');
        return;
    }

    if (sonuclar.length === 1) {
        const d = sonuclar[0];
        const marker = state.markers.find(m => m.data.id === d.id);
        if (marker) {
            state.map.panTo([d.lat, d.lng]);
            direkSec(d, marker.marker);
        }
    } else {
        let liste = 'Birden fazla direk bulundu:\n\n';
        sonuclar.forEach((d, i) => {
            liste += `${i + 1}. ${d.numara} (${d.tip_adi})\n`;
        });
        alert(liste);
    }
}
