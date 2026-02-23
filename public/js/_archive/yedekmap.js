const API_URL = 'http://localhost:3000/api';
let map;
let markers = [];
let polylines = [];
let selectedDirek = null;
let currentTool = 'select';
let currentProject = null;
let measurePoints = [];
let linePoints = [];
let measureLine = null;
// Zincirleme hat çizimi değişkenleri
let zincirlemeHatModu = false;
let zincirlemeSonDirek = null;
let zincirlemeHatlar = [];
let seciliIletken = null;

const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/';
}

const user = JSON.parse(localStorage.getItem('user') || '{}');
document.getElementById('userName').textContent = user.username;
if (user.role === 'admin') {
    document.getElementById('adminLink').style.display = 'inline';
}

async function api(url, options = {}) {
    const res = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (res.status === 401) {
        localStorage.clear();
        window.location.href = '/';
        return;
    }

    return res.json();
}

function showNotification(message, type = 'info') {
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;

    if (type === 'success') div.style.background = '#10b981';
    else if (type === 'error') div.style.background = '#ef4444';
    else div.style.background = '#3b82f6';

    div.textContent = message;
    document.body.appendChild(div);

    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.3s';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

function initMap() {
    map = L.map('map', {
        center: [39.9334, 32.8597],
        zoom: 6,
        zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri',
        maxZoom: 19
    });

    const baseMaps = {
        "Harita": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
        "Uydu": satelliteLayer,
        "Topografik": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png')
    };

    L.control.layers(baseMaps).addTo(map);
    L.control.scale().addTo(map);

    map.on('click', function (e) {
        handleMapClick(e.latlng);
    });

    document.addEventListener('keydown', function (e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key.toLowerCase()) {
            case 'v': setTool('select'); break;
            case 'a': setTool('add'); break;
            case 'm': setTool('measure'); break;
            // l tusu kaldirildi
            case 'escape':
                if (zincirlemeHatModu) {
                    zincirlemeModuKapat();
                } else {
                    setTool('select');
                    temizleCizimler();
                }
                break;
        }
    });

    loadProjeler();
    loadTipler();
    loadCinsler();
    loadMalzemeler();
}

function handleMapClick(latlng) {
    const lat = latlng.lat;
    const lng = latlng.lng;

    if (currentTool === 'add') {
        hizliDirekEkle(lat, lng);
    } else if (currentTool === 'measure') {
        measurePoints.push([lat, lng]);

        L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: '#ef4444',
            fillOpacity: 1,
            color: '#fff',
            weight: 2
        }).addTo(map).bindPopup('Nokta ' + measurePoints.length).openPopup();

        if (measurePoints.length === 2) {
            if (measureLine) map.removeLayer(measureLine);

            measureLine = L.polyline(measurePoints, {
                color: '#ef4444',
                weight: 4,
                dashArray: '10, 10'
            }).addTo(map);

            const mesafe = map.distance(measurePoints[0], measurePoints[1]);

            document.getElementById('measureDistance').textContent = mesafe.toFixed(2);
            document.getElementById('measureResult').style.display = 'block';

            L.popup()
                .setLatLng([(measurePoints[0][0] + measurePoints[1][0]) / 2, (measurePoints[0][1] + measurePoints[1][1]) / 2])
                .setContent(`<b>Mesafe:</b> ${mesafe.toFixed(2)} m`)
                .openOn(map);
        }
    }
}

function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));

    const toolMap = {
        'select': 'toolSelect',
        'add': 'toolAdd',
        'measure': 'toolMeasure'
    };

    if (toolMap[tool]) {
        document.getElementById(toolMap[tool]).classList.add('active');
    }

    const mapDiv = document.getElementById('map');
    if (tool === 'add' || tool === 'zincirleme') {
        mapDiv.style.cursor = 'crosshair';
    } else if (tool === 'measure') {
        mapDiv.style.cursor = 'help';
    } else {
        mapDiv.style.cursor = 'default';
    }
}

async function loadProjeler() {
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

async function loadTipler() {
    const tipler = await api('/tipler');

    ['direkTipi', 'editTip'].forEach(id => {
        const select = document.getElementById(id);
        select.innerHTML = '';
        tipler.forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = t.ad;
            option.dataset.renk = t.renk;
            select.appendChild(option);
        });
    });
}

async function loadCinsler() {
    const cinsler = await api('/tipler/cins');

    ['direkCinsi', 'editCins'].forEach(id => {
        const select = document.getElementById(id);
        select.innerHTML = '';
        cinsler.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.ad;
            select.appendChild(option);
        });
    });
}

async function loadMalzemeler() {
    const malzemeler = await api('/malzemeler');
    const select = document.getElementById('malzemeSelect');
    select.innerHTML = '';
    malzemeler.forEach(m => {
        const option = document.createElement('option');
        option.value = m.id;
        option.textContent = `${m.kod} - ${m.ad} (${m.birim})`;
        select.appendChild(option);
    });
}

async function projeDegistir() {
    const projeId = document.getElementById('projeSelect').value;
    if (!projeId) {
        currentProject = null;
        document.getElementById('currentProjectName').textContent = 'Proje seçilmedi';
        markers.forEach(m => map.removeLayer(m.marker));
        markers = [];
        return;
    }

    currentProject = projeId;
    const projeler = await api('/projeler');
    const proje = projeler.find(p => p.id == projeId);
    document.getElementById('currentProjectName').textContent = proje.ad;

    loadDirekler(projeId);
}

async function sonrakiNumarayiBul() {
    const direkler = await api(`/direkler/proje/${currentProject}`);

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

async function loadDirekler(projeId) {
    markers.forEach(m => map.removeLayer(m.marker));
    markers = [];
    polylines.forEach(p => map.removeLayer(p));
    polylines = [];

    const direkler = await api(`/direkler/proje/${projeId}`);

    document.getElementById('toplamDirek').textContent = direkler.length;

    const list = document.getElementById('direkList');
    list.innerHTML = '';

    let toplamMesafe = 0;
    const sortedDirekler = [...direkler].sort((a, b) => a.numara.localeCompare(b.numara));

    sortedDirekler.forEach((d, index) => {
        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="direk-marker" style="background-color: ${d.renk || '#3b82f6'};" data-id="${d.id}">${d.numara.slice(-2)}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const marker = L.marker([d.lat, d.lng], {
            icon: customIcon,
            draggable: true
        }).addTo(map);

        marker.bindTooltip(`
            <b>${d.numara}</b><br>
            ${d.tip_adi} | ${d.cins_adi}<br>
            Lat: ${d.lat.toFixed(6)}<br>
            Lng: ${d.lng.toFixed(6)}
        `, {
            direction: 'top',
            offset: [0, -10]
        });

        marker.on('click', () => direkSec(d, marker));

        marker.on('dragend', async (e) => {
            const newLat = e.target.getLatLng().lat;
            const newLng = e.target.getLatLng().lng;
            await direkTasi(d.id, newLat, newLng);
        });

        markers.push({ marker, data: d });

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
            map.panTo([d.lat, d.lng]);
            direkSec(d, marker);
        };
        list.appendChild(item);
    });

    if (direkler.length > 0) {
        const group = new L.featureGroup(markers.map(m => m.marker));
        map.fitBounds(group.getBounds().pad(0.1));
    }

    // Hatları veritabanından yükle
    await hatlariYukle();
}

function direkSec(direk, marker) {
    selectedDirek = direk;

    document.querySelectorAll('.direk-item').forEach(el => {
        el.classList.remove('active');
        if (parseInt(el.dataset.id) === direk.id) {
            el.classList.add('active');
        }
    });

    markers.forEach(m => {
        const el = m.marker.getElement();
        if (el) el.querySelector('.direk-marker').classList.remove('selected');
    });

    const markerEl = marker.getElement();
    if (markerEl) markerEl.querySelector('.direk-marker').classList.add('selected');

    document.getElementById('editNumara').value = direk.numara || '';
    document.getElementById('editTip').value = direk.tip_id || '';
    document.getElementById('editCins').value = direk.cins_id || '';
    document.getElementById('editLat').value = direk.lat || '';
    document.getElementById('editLng').value = direk.lng || '';

    // YENİ: Açıklama ve fotoğraf
    const editAciklama = document.getElementById('editAciklama');
    if (editAciklama) editAciklama.value = direk.aciklama || '';

    const fotoOnizleme = document.getElementById('fotoOnizleme');
    if (fotoOnizleme) {
        if (direk.foto_yolu) {
            fotoOnizleme.innerHTML = `<img src="${direk.foto_yolu}" style="max-width: 100%; border-radius: 8px; border: 2px solid #3b82f6;">`;
        } else {
            fotoOnizleme.innerHTML = '<div style="color: #94a3b8; font-size: 12px; padding: 10px; background: #1e293b; border-radius: 4px;">Fotoğraf yok</div>';
        }
    }

    document.getElementById('direkDetaySection').style.display = 'block';

    loadDirekMalzemeler(direk.id);

    document.getElementById('direkDetaySection').scrollIntoView({ behavior: 'smooth' });
}

function direkSecById(id) {
    const found = markers.find(m => m.data.id === id);
    if (found) direkSec(found.data, found.marker);
}

async function direkTasi(direkId, lat, lng) {
    const direkData = selectedDirek || markers.find(m => m.data.id === direkId).data;

    await api(`/direkler/${direkId}`, {
        method: 'PUT',
        body: JSON.stringify({
            tip_id: direkData.tip_id,
            cins_id: direkData.cins_id,
            numara: direkData.numara,
            lat, lng
        })
    });
    loadDirekler(currentProject);
    showNotification('Direk yeni konuma taşındı', 'success');
}

async function hizliDirekEkle(lat, lng) {
    if (!currentProject) {
        alert('Önce bir proje seçin!');
        setTool('select');
        return;
    }

    const tip_id = document.getElementById('direkTipi').value || 1;
    const cins_id = document.getElementById('direkCinsi').value || 1;
    const numara = await sonrakiNumarayiBul();

    try {
        const res = await api('/direkler', {
            method: 'POST',
            body: JSON.stringify({
                proje_id: parseInt(currentProject),
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

        await loadDirekler(currentProject);

        setTimeout(() => {
            const yeniDirek = markers.find(m => m.data.numara === numara);
            if (yeniDirek) {
                direkSec(yeniDirek.data, yeniDirek.marker);
                map.panTo([lat, lng]);
            }
        }, 100);

        showNotification(`Direk eklendi: ${numara} - Düzenlemek için tıklayın`, 'success');

    } catch (err) {
        console.error('Hızlı ekleme hatası:', err);
        alert('Direk eklenirken hata oluştu!');
    }
}

async function direkEkle() {
    if (!currentProject) {
        alert('Önce bir proje seçin!');
        return;
    }

    let numara = document.getElementById('direkNumara').value.trim();
    const tip_id = document.getElementById('direkTipi').value;
    const cins_id = document.getElementById('direkCinsi').value;
    const lat = parseFloat(document.getElementById('direkLat').value);
    const lng = parseFloat(document.getElementById('direkLng').value);

    if (!numara) {
        numara = await sonrakiNumarayiBul();
        document.getElementById('direkNumara').value = numara;
    }

    if (!tip_id) {
        alert('Direk tipi seçin!');
        return;
    }

    if (!cins_id) {
        alert('Direk cinsi seçin!');
        return;
    }

    if (isNaN(lat) || isNaN(lng)) {
        alert('Geçerli koordinatlar girin!');
        return;
    }

    try {
        const res = await api('/direkler', {
            method: 'POST',
            body: JSON.stringify({
                proje_id: parseInt(currentProject),
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

        document.getElementById('direkNumara').value = '';
        document.getElementById('direkLat').value = '';
        document.getElementById('direkLng').value = '';

        await loadDirekler(currentProject);

        setTimeout(() => {
            const yeniDirek = markers.find(m => m.data.numara === numara);
            if (yeniDirek) {
                direkSec(yeniDirek.data, yeniDirek.marker);
            }
        }, 100);

        showNotification('Direk eklendi: ' + numara, 'success');

    } catch (err) {
        console.error('Direk ekleme hatası:', err);
        alert('Direk eklenirken hata oluştu!');
    }
}

async function direkGuncelle() {
    if (!selectedDirek) return;

    const numara = document.getElementById('editNumara').value;
    const tip_id = document.getElementById('editTip').value;
    const cins_id = document.getElementById('editCins').value;
    const lat = parseFloat(document.getElementById('editLat').value);
    const lng = parseFloat(document.getElementById('editLng').value);

    if (!numara) {
        alert('Numara boş bırakılamaz!');
        return;
    }

    await api(`/direkler/${selectedDirek.id}`, {
        method: 'PUT',
        body: JSON.stringify({ tip_id, cins_id, numara, lat, lng })
    });

    loadDirekler(currentProject);
    showNotification('Direk güncellendi', 'success');
}

async function direkSil() {
    if (!selectedDirek) return;
    if (!confirm(`"${selectedDirek.numara}" numaralı direği silmek istediğinize emin misiniz?`)) return;

    await api(`/direkler/${selectedDirek.id}`, { method: 'DELETE' });

    document.getElementById('direkDetaySection').style.display = 'none';
    selectedDirek = null;
    loadDirekler(currentProject);
    showNotification('Direk silindi', 'success');
}

// YENİ: Açıklama kaydet
async function aciklamaKaydet() {
    if (!selectedDirek) {
        alert('Önce bir direk seçin!');
        return;
    }

    const editAciklama = document.getElementById('editAciklama');
    if (!editAciklama) return;

    const aciklama = editAciklama.value;

    try {
        const res = await api(`/direkler/${selectedDirek.id}/aciklama`, {
            method: 'PUT',
            body: JSON.stringify({ aciklama })
        });

        if (res.error) {
            showNotification('Hata: ' + res.error, 'error');
            return;
        }

        selectedDirek.aciklama = aciklama;
        showNotification('Açıklama kaydedildi', 'success');

    } catch (err) {
        console.error('Açıklama kaydetme hatası:', err);
        showNotification('Açıklama kaydedilemedi', 'error');
    }
}

// YENİ: Fotoğraf yükle
async function fotoYukle(input) {
    if (!selectedDirek) {
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

        const res = await fetch(`${API_URL}/direkler/${selectedDirek.id}/foto`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
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
                `<img src="${data.foto_yolu}" style="max-width: 100%; border-radius: 8px; border: 2px solid #10b981;">`;
            selectedDirek.foto_yolu = data.foto_yolu;
        }

        showNotification('Fotoğraf yüklendi', 'success');

    } catch (err) {
        console.error('Fotoğraf yükleme hatası:', err);
        showNotification('Fotoğraf yüklenemedi', 'error');
    } finally {
        input.value = '';
    }
}

async function loadDirekMalzemeler(direkId) {
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
                <strong>${m.kod}</strong><br>
                <small>${m.malzeme_adi}</small>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: bold; color: #3b82f6;">${m.miktar} ${m.birim}</div>
                <button onclick="malzemeSil(${m.id})" style="background: #ef4444; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-top: 5px;">Sil</button>
            </div>
        `;
        list.appendChild(item);
    });
}

async function malzemeEkle() {
    if (!selectedDirek) return;

    const malzeme_id = document.getElementById('malzemeSelect').value;
    const miktar = parseFloat(document.getElementById('malzemeMiktar').value);

    if (!miktar || miktar <= 0) {
        alert('Geçerli bir miktar girin!');
        return;
    }

    await api(`/direkler/${selectedDirek.id}/malzemeler`, {
        method: 'POST',
        body: JSON.stringify({ malzeme_id, miktar })
    });

    loadDirekMalzemeler(selectedDirek.id);
    showNotification('Malzeme eklendi', 'success');
}

async function malzemeSil(malzemeId) {
    await api(`/direkler/${selectedDirek.id}/malzemeler/${malzemeId}`, { method: 'DELETE' });
    loadDirekMalzemeler(selectedDirek.id);
    showNotification('Malzeme silindi', 'success');
}

function haritadanSec() {
    setTool('add');
    showNotification('Haritaya tıklayarak direk ekleyin', 'info');
}

function yeniProjeModal() {
    document.getElementById('projeModal').style.display = 'flex';
    document.getElementById('yeniProjeAd').focus();
}

function kapatModal() {
    document.getElementById('projeModal').style.display = 'none';
    document.getElementById('yeniProjeAd').value = '';
    document.getElementById('yeniProjeAciklama').value = '';
}

async function projeOlustur() {
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

function temizleCizimler() {
    measurePoints = [];
    linePoints = [];
    if (measureLine) {
        map.removeLayer(measureLine);
        measureLine = null;
    }
    document.getElementById('measureResult').style.display = 'none';

    map.eachLayer(layer => {
        if (layer instanceof L.Polyline && !polylines.includes(layer)) {
            map.removeLayer(layer);
        }
        if (layer instanceof L.CircleMarker && !markers.find(m => m.marker === layer)) {
            map.removeLayer(layer);
        }
    });

    setTool('select');
}

function kapatMeasure() {
    document.getElementById('measureResult').style.display = 'none';
    temizleCizimler();
}

function exportExcel() {
    if (!currentProject) {
        alert('Önce bir proje seçin!');
        return;
    }

    api(`/direkler/proje/${currentProject}`).then(direkler => {
        let csv = '\uFEFF';
        csv += 'Numara,Tip,Cins,Enlem,Boylam,Aciklama\n';

        direkler.forEach(d => {
            csv += `${d.numara},${d.tip_adi},${d.cins_adi},${d.lat},${d.lng},"${d.aciklama || ''}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `direkler_proje_${currentProject}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        showNotification('Excel dosyası indirildi', 'success');
    });
}

function exportKML() {
    if (!currentProject) {
        alert('Önce bir proje seçin!');
        return;
    }

    api(`/direkler/proje/${currentProject}`).then(direkler => {
        let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
    <name>Elektrik Direkleri - Proje ${currentProject}</name>
    <Style id="direkStyle">
        <IconStyle>
            <Icon>
                <href>http://maps.google.com/mapfiles/kml/shapes/target.png</href>
            </Icon>
        </IconStyle>
    </Style>`;

        direkler.forEach(d => {
            kml += `
    <Placemark>
        <name>${d.numara}</name>
        <description>
            <![CDATA[
                <b>Tip:</b> ${d.tip_adi}<br>
                <b>Cins:</b> ${d.cins_adi}<br>
                <b>Açıklama:</b> ${d.aciklama || '-'}<br>
                <b>Koordinatlar:</b> ${d.lat}, ${d.lng}
            ]]>
        </description>
        <styleUrl>#direkStyle</styleUrl>
        <Point>
            <coordinates>${d.lng},${d.lat},0</coordinates>
        </Point>
    </Placemark>`;
        });

        const sorted = [...direkler].sort((a, b) => a.numara.localeCompare(b.numara));
        if (sorted.length > 1) {
            let coordinates = '';
            sorted.forEach(d => {
                coordinates += `${d.lng},${d.lat},0 `;
            });

            kml += `
    <Placemark>
        <name>Direk Hattı</name>
        <LineString>
            <coordinates>${coordinates.trim()}</coordinates>
        </LineString>
        <Style>
            <LineStyle>
                <color>ff0000ff</color>
                <width>3</width>
            </LineStyle>
        </Style>
    </Placemark>`;
        }

        kml += `
</Document>
</kml>`;

        const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `direkler_proje_${currentProject}_${new Date().toISOString().split('T')[0]}.kml`;
        link.click();

        showNotification('KML dosyası indirildi', 'success');
    });
}

// YENİ: Direk ara
function direkAraKeyup(e) {
    if (e.key === 'Enter') {
        direkAraBtn();
    }
}

async function direkAraBtn() {
    if (!currentProject) {
        alert('Önce proje seçin!');
        return;
    }

    const q = document.getElementById('direkAraInput').value.trim();
    if (!q) return;

    const sonuclar = await api(`/direkler/ara/${currentProject}?q=${encodeURIComponent(q)}`);

    if (sonuclar.length === 0) {
        showNotification('Direk bulunamadı', 'error');
        return;
    }

    if (sonuclar.length === 1) {
        const d = sonuclar[0];
        const marker = markers.find(m => m.data.id === d.id);
        if (marker) {
            map.panTo([d.lat, d.lng]);
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

// YENİ: Malzeme raporu
async function malzemeRaporu() {
    if (!currentProject) {
        alert('Önce bir proje seçin!');
        return;
    }

    const data = await api(`/direkler/proje/${currentProject}/malzemeler`);

    let html = `
        <div class="modal" id="raporModal" style="display: flex;">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>Proje Malzeme Raporu</h2>
                    <button class="close-btn" onclick="document.getElementById('raporModal').remove()">&times;</button>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f1f5f9;">
                            <th style="padding: 10px; text-align: left;">Kod</th>
                            <th style="padding: 10px; text-align: left;">Ad</th>
                            <th style="padding: 10px; text-align: center;">Miktar</th>
                            <th style="padding: 10px; text-align: right;">Birim Fiyat</th>
                            <th style="padding: 10px; text-align: right;">Toplam</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    data.malzemeler.forEach(m => {
        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px;">${m.kod}</td>
                <td style="padding: 10px;">${m.ad}</td>
                <td style="padding: 10px; text-align: center;">${m.toplam_miktar} ${m.birim}</td>
                <td style="padding: 10px; text-align: right;">${m.birim_fiyat ? m.birim_fiyat + ' ' + m.para_birimi : '-'}</td>
                <td style="padding: 10px; text-align: right; font-weight: bold;">${m.maliyet ? m.maliyet.toFixed(2) : '-'}</td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                    <tfoot>
                        <tr style="background: #1e293b; color: white; font-weight: bold;">
                            <td colspan="4" style="padding: 15px; text-align: right;">TOPLAM MALİYET:</td>
                            <td style="padding: 15px; text-align: right;">${data.toplam_maliyet.toFixed(2)} TRY</td>
                        </tr>
                    </tfoot>
                </table>
                <button class="btn btn-primary" onclick="window.print()" style="margin-top: 20px;">📄 PDF İndir</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
}

// ============================================
// ANLIK KONUM VE YOL TARİFİ
// ============================================

let userLocationMarker = null;
let userLocationCircle = null;

// Anlık konumu göster
function konumumuGoster() {
    if (!navigator.geolocation) {
        alert('Tarayıcınız konum desteklemiyor!');
        return;
    }

    showNotification('Konumunuz alınıyor...', 'info');

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            // Eski marker'ı sil
            if (userLocationMarker) {
                map.removeLayer(userLocationMarker);
                map.removeLayer(userLocationCircle);
            }

            // Yeni marker ekle
            userLocationMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'user-location',
                    html: '<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(map);

            // Hassasiyet çemberi
            userLocationCircle = L.circle([lat, lng], {
                radius: accuracy,
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 1
            }).addTo(map);

            map.panTo([lat, lng]);
            showNotification(`Konumunuz: ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${Math.round(accuracy)}m)`, 'success');

            // En yakın direği bul
            enYakinDirekBul(lat, lng);
        },
        (err) => {
            showNotification('Konum alınamadı: ' + err.message, 'error');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// En yakın direği bul
function enYakinDirekBul(userLat, userLng) {
    if (!currentProject || markers.length === 0) return;

    let enYakin = null;
    let minMesafe = Infinity;

    markers.forEach(m => {
        const mesafe = map.distance([userLat, userLng], [m.data.lat, m.data.lng]);
        if (mesafe < minMesafe) {
            minMesafe = mesafe;
            enYakin = m;
        }
    });

    if (enYakin) {
        const mesafeMetre = Math.round(minMesafe);
        const mesafeKm = (minMesafe / 1000).toFixed(2);

        showNotification(
            `En yakın direk: ${enYakin.data.numara} (${mesafeMetre}m)`,
            'info'
        );

        // Çizgi çiz
        if (window.yolTarifiLine) map.removeLayer(window.yolTarifiLine);

        window.yolTarifiLine = L.polyline(
            [[userLat, userLng], [enYakin.data.lat, enYakin.data.lng]],
            { color: '#10b981', weight: 4, dashArray: '10, 10' }
        ).addTo(map);
    }
}

// Yol tarifi (Google Maps)
function yolTarifiAl() {
    if (!selectedDirek) {
        alert('Önce bir direk seçin!');
        return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedDirek.lat},${selectedDirek.lng}`;
    window.open(url, '_blank');
}

// ============================================
// HAT YÖNETİMİ (İLETKEN BİLGİSİ)
// ============================================

let hatCizimModu = false;
let hatBaslangicDirek = null;
let tempHatLine = null;

// Hat çizim modunu başlat
function hatCizimModuBaslat() {
    if (!currentProject) {
        alert('Önce proje seçin!');
        return;
    }

    hatCizimModu = true;
    hatBaslangicDirek = null;
    showNotification('Hat çizimi: Başlangıç direğine tıklayın', 'info');

    // Direk marker'larını vurgula
    markers.forEach(m => {
        m.marker.setOpacity(1);
        m.marker.on('click', hatDirekSec);
    });
}

function hatDirekSec(e) {
    if (!hatCizimModu) return;

    const clickedMarker = e.target;
    const direkData = markers.find(m => m.marker === clickedMarker).data;

    if (!hatBaslangicDirek) {
        // İlk direk seçildi
        hatBaslangicDirek = direkData;
        showNotification(`Başlangıç: ${direkData.numara} - Bitiş direğine tıklayın`, 'info');

        // Vurgula
        clickedMarker.setIcon(L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="direk-marker" style="background-color: #10b981; box-shadow: 0 0 0 4px #10b981;">${direkData.numara.slice(-2)}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        }));

    } else {
        // İkinci direk seçildi - hat oluştur
        if (hatBaslangicDirek.id === direkData.id) {
            showNotification('Aynı direk seçilemez!', 'error');
            return;
        }

        hatOlustur(hatBaslangicDirek, direkData);
    }
}

async function hatOlustur(direk1, direk2) {
    const mesafe = map.distance([direk1.lat, direk1.lng], [direk2.lat, direk2.lng]);

    // İletken bilgisi al
    const iletkenTipi = prompt('İletken Tipi (örn: AAC, AAAC, ACSR):', 'AAC') || 'AAC';
    const iletkenCinsi = prompt('İletken Cinsi (örn: Bölünmüş, Tekli):', 'Bölünmüş') || 'Bölünmüş';
    const kesit = parseFloat(prompt('Kesit (mm²):', '95')) || 95;

    try {
        const res = await api('/direkler/hat', {
            method: 'POST',
            body: JSON.stringify({
                proje_id: parseInt(currentProject),
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

        // Hatı çiz
        const hatLine = L.polyline(
            [[direk1.lat, direk1.lng], [direk2.lat, direk2.lng]],
            {
                color: getIletkenRenk(iletkenTipi),
                weight: 3,
                opacity: 0.8
            }
        ).addTo(map);

        // Bilgi popup
        hatLine.bindPopup(`
            <b>Hat Bilgisi</b><br>
            ${direk1.numara} → ${direk2.numara}<br>
            İletken: ${iletkenTipi} ${iletkenCinsi}<br>
            Kesit: ${kesit} mm²<br>
            Mesafe: ${mesafe.toFixed(2)} m
        `);

        polylines.push(hatLine);

        showNotification('Hat oluşturuldu', 'success');

    } catch (err) {
        console.error('Hat oluşturma hatası:', err);
        showNotification('Hat oluşturulamadı', 'error');
    }

    // Modu kapat
    hatCizimModuKapat();
}

function hatCizimModuKapat() {
    hatCizimModu = false;
    hatBaslangicDirek = null;

    // Event listener'ları temizle
    markers.forEach(m => {
        m.marker.off('click', hatDirekSec);
    });

    loadDirekler(currentProject); // Marker'ları yenile
}

function getIletkenRenk(tip) {
    const renkler = {
        'AAC': '#ef4444',
        'AAAC': '#3b82f6',
        'ACSR': '#10b981',
        'ACAR': '#f59e0b'
    };
    return renkler[tip] || '#64748b';
}

// Otomatik hat oluşturma (en yakın komşu)
async function otomatikHatOlustur() {
    if (!currentProject) {
        alert('Önce proje seçin!');
        return;
    }

    const direkler = await api(`/direkler/proje/${currentProject}`);
    if (direkler.length < 2) {
        alert('En az 2 direk gerekli!');
        return;
    }

    // İletken bilgisi al
    const iletkenTipi = prompt('İletken Tipi:', 'AAC') || 'AAC';
    const iletkenCinsi = prompt('İletken Cinsi:', 'Bölünmüş') || 'Bölünmüş';
    const kesit = parseFloat(prompt('Kesit (mm²):', '95')) || 95;

    // En yakın komşu algoritması
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
                const mesafe = map.distance([mevcut.lat, mevcut.lng], [d.lat, d.lng]);
                if (mesafe < minMesafe) {
                    minMesafe = mesafe;
                    enYakin = d;
                }
            }
        });

        if (enYakin) {
            // Hat oluştur
            await api('/direkler/hat', {
                method: 'POST',
                body: JSON.stringify({
                    proje_id: parseInt(currentProject),
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

    // Hatları çiz
    hatlariYukle();

    let toplamMesafe = 0;
    for (let i = 0; i < rota.length - 1; i++) {
        toplamMesafe += map.distance([rota[i].lat, rota[i].lng], [rota[i + 1].lat, rota[i + 1].lng]);
    }

    showNotification(`Otomatik hat: ${rota.length} direk, ${(toplamMesafe / 1000).toFixed(2)} km`, 'success');
}

async function hatlariYukle() {
    if (!currentProject) return;

    const hatlar = await api(`/direkler/proje/${currentProject}/hatlar`);

    // Eski hatları temizle
    polylines.forEach(p => map.removeLayer(p));
    polylines = [];

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
        ).addTo(map);

        hatLine.bindPopup(`
            <div style="font-family: 'Segoe UI', sans-serif; min-width: 220px;">
                <b>${h.direk1_numara} → ${h.direk2_numara}</b><br>
                <table style="width: 100%; font-size: 12px; margin: 8px 0;">
                    <tr><td>İletken:</td><td><b>${h.iletken_tipi || '-'}</b> ${h.iletken_cinsi || ''}</td></tr>
                    <tr><td>Kesit:</td><td>${h.kesit_mm2 || '-'} mm²</td></tr>
                    <tr><td>Mesafe:</td><td>${mesafe ? mesafe.toFixed(2) + ' m' : '-'}</td></tr>
                </table>
                <div style="display: flex; gap: 5px;">
                    <button onclick="hatDuzenleModal(${h.id})" style="flex:1; background: #3b82f6; color: white; border: none; padding: 6px; border-radius: 4px; cursor: pointer;">Düzenle</button>
                    <button onclick="hatSil(${h.id})" style="flex:1; background: #ef4444; color: white; border: none; padding: 6px; border-radius: 4px; cursor: pointer;">Sil</button>
                </div>
            </div>
        `);

        polylines.push(hatLine);
    });

    document.getElementById('toplamMesafe').textContent = (toplamMesafe / 1000).toFixed(2);
}

// ============================================
// HAT SİL
// ============================================
async function hatSil(hatId) {
    if (!confirm('Bu hattı silmek istediğinize emin misiniz?')) return;

    try {
        await api(`/direkler/hat/${hatId}`, { method: 'DELETE' });
        showNotification('Hat silindi', 'success');
        hatlariYukle();
    } catch (err) {
        console.error('Hat silme hatası:', err);
        showNotification('Hat silinemedi', 'error');
    }
}

// ============================================
// HAT DÜZENLEME
// ============================================
async function hatDuzenleModal(hatId) {
    map.closePopup();

    const iletkenler = await api('/tipler/iletken');
    const hatlar = await api(`/direkler/proje/${currentProject}/hatlar`);
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

async function hatGuncelle(hatId) {
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

async function zincirlemeHatModuBaslat() {
    if (!currentProject) {
        alert('Önce proje seçin!');
        return;
    }

    // İletken seçim modalı göster
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

function zincirlemeBaslat() {
    const iletkenTipi = document.getElementById('secimIletkenTipi').value;
    const iletkenCinsi = document.getElementById('secimIletkenCinsi').value;
    const kesit = document.getElementById('secimKesit').value;

    seciliIletken = {
        tip: iletkenTipi,
        cinsi: iletkenCinsi,
        kesit: parseFloat(kesit),
        renk: document.getElementById('secimIletkenTipi').selectedOptions[0].dataset.renk
    };

    document.getElementById('iletkenModal').remove();

    // Modu aktif et
    zincirlemeHatModu = true;
    zincirlemeSonDirek = null;
    zincirlemeHatlar = [];

    setTool('zincirleme');
    showNotification('Zincirleme hat modu: İlk direğe tıklayın (ESC ile bitir)', 'success');

    // Direk marker'larına özel click event ekle
    markers.forEach(m => {
        m.marker.off('click'); // Eski eventleri kaldır
        m.marker.on('click', zincirlemeDirekSec);
        m.marker.setOpacity(1);
    });
}

function zincirlemeDirekSec(e) {
    if (!zincirlemeHatModu) return;

    const clickedMarker = e.target;
    const direkData = markers.find(m => m.marker === clickedMarker).data;

    if (!zincirlemeSonDirek) {
        // İlk direk seçildi
        zincirlemeSonDirek = direkData;

        // Vurgula
        clickedMarker.setIcon(L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="direk-marker" style="background-color: #10b981; box-shadow: 0 0 0 4px #10b981, 0 0 20px #10b981; animation: pulse 1s infinite;">${direkData.numara.slice(-2)}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        }));

        showNotification(`Başlangıç: ${direkData.numara} - Sonraki direğe tıklayın`, 'info');

    } else {
        // İkinci veya sonraki direk seçildi
        if (zincirlemeSonDirek.id === direkData.id) {
            showNotification('Aynı direk seçilemez!', 'error');
            return;
        }

        // Hat çiz
        zincirlemeHatCiz(zincirlemeSonDirek, direkData);

        // Son direği güncelle
        const oncekiDirek = zincirlemeSonDirek;
        zincirlemeSonDirek = direkData;

        // Önceki direk normal görünüme dön
        const oncekiMarker = markers.find(m => m.data.id === oncekiDirek.id);
        if (oncekiMarker) {
            oncekiMarker.marker.setIcon(L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="direk-marker" style="background-color: ${oncekiDirek.renk || '#3b82f6'};">${oncekiDirek.numara.slice(-2)}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            }));
        }

        // Yeni direği vurgula
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
    const mesafe = map.distance([direk1.lat, direk1.lng], [direk2.lat, direk2.lng]);

    try {
        // Veritabanına kaydet
        const res = await api('/direkler/hat', {
            method: 'POST',
            body: JSON.stringify({
                proje_id: parseInt(currentProject),
                direk1_id: direk1.id,
                direk2_id: direk2.id,
                iletken_tipi: seciliIletken.tip,
                iletken_cinsi: seciliIletken.cinsi,
                kesit_mm2: seciliIletken.kesit,
                mesafe_metre: mesafe
            })
        });

        // Haritada çiz
        const hatLine = L.polyline(
            [[direk1.lat, direk1.lng], [direk2.lat, direk2.lng]],
            {
                color: seciliIletken.renk,
                weight: 4,
                opacity: 0.9,
                smoothFactor: 1
            }
        ).addTo(map);

        // Ok işareti ekle (yön göstergesi)
        const okIkon = L.divIcon({
            className: 'hat-ok',
            html: `<div style="color: ${seciliIletken.renk}; font-size: 14px; font-weight: bold;">➤</div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        const ortaNokta = [
            (direk1.lat + direk2.lat) / 2,
            (direk1.lng + direk2.lng) / 2
        ];

        const okMarker = L.marker(ortaNokta, {
            icon: okIkon
        }).addTo(map);

        // Popup
        hatLine.bindPopup(`
        <div style="font-family: 'Segoe UI', sans-serif; min-width: 200px;">
            <h4 style="margin: 0 0 10px 0; color: ${seciliIletken.renk};">Hat Bilgisi</h4>
            <table style="width: 100%; font-size: 12px;">
                <tr><td><b>Baslangic:</b></td><td>${direk1.numara}</td></tr>
                <tr><td><b>Bitis:</b></td><td>${direk2.numara}</td></tr>
                <tr><td><b>Iletken:</b></td><td>${seciliIletken.tip} ${seciliIletken.cinsi}</td></tr>
                <tr><td><b>Kesit:</b></td><td>${seciliIletken.kesit} mm2</td></tr>
                <tr><td><b>Mesafe:</b></td><td>${mesafe.toFixed(2)} m</td></tr>
            </table>
            <button onclick="hatSil(${res.id})" style="margin-top: 10px; background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; width: 100%;">Sil</button>
        </div>
        `);

        zincirlemeHatlar.push({ line: hatLine, ok: okMarker, id: res.id });
        polylines.push(hatLine);

    } catch (err) {
        console.error('Hat cizim hatasi:', err);
        showNotification('Hat kaydedilemedi', 'error');
    }
}

function zincirlemeModuKapat() {
    if (!zincirlemeHatModu) return;

    zincirlemeHatModu = false;

    // Son diregi normal gorunume dondur
    if (zincirlemeSonDirek) {
        const sonMarker = markers.find(m => m.data.id === zincirlemeSonDirek.id);
        if (sonMarker) {
            sonMarker.marker.setIcon(L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="direk-marker" style="background-color: ${zincirlemeSonDirek.renk || '#3b82f6'};">${zincirlemeSonDirek.numara.slice(-2)}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            }));
        }
    }

    zincirlemeSonDirek = null;
    seciliIletken = null;

    // Event listener'lari eski haline dondur
    markers.forEach(m => {
        m.marker.off('click', zincirlemeDirekSec);
        m.marker.on('click', () => direkSec(m.data, m.marker));
    });

    setTool('select');
    showNotification(`Zincirleme hat modu kapandi. ${zincirlemeHatlar.length} hat cizildi.`, 'success');
}

// ============================================
// TOPLU IMPORT MODAL
// ============================================
function topluImportModal() {
    if (!currentProject) {
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

async function topluImportYap() {
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
        const res = await api(`/direkler/import/${currentProject}`, {
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

        loadDirekler(currentProject);
        showNotification(`${res.imported} direk import edildi`, 'success');
    } catch (err) {
        console.error('Import hatasi:', err);
        showNotification('Import basarisiz', 'error');
    }
}

// ============================================
// GPX/KML IMPORT
// ============================================

function gpxImportModal() {
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

async function gpxYukle(input) {
    if (!currentProject) {
        alert('Önce proje seçin!');
        return;
    }

    if (!input.files[0]) return;

    const formData = new FormData();
    formData.append('gpx', input.files[0]);

    showNotification('Dosya yükleniyor...', 'info');

    try {
        const res = await fetch(`${API_URL}/direkler/gpx-import/${currentProject}`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });

        const data = await res.json();

        if (data.imported > 0) {
            document.getElementById('gpxSonuc').innerHTML = `
                <div style="color: #10b981; font-weight: bold;">
                    ${data.imported} nokta yüklendi!
                </div>
                <button class="btn btn-primary" onclick="gpsNoktalariGoster()" style="margin-top: 10px;">
                    Haritada Göster
                </button>
            `;
            showNotification(`${data.imported} GPS noktası import edildi`, 'success');
        }

    } catch (err) {
        showNotification('Import hatası', 'error');
    }
}

async function gpsNoktalariGoster() {
    const noktalar = await api(`/direkler/proje/${currentProject}/gps`);

    noktalar.forEach(n => {
        L.circleMarker([n.lat, n.lng], {
            radius: 6,
            fillColor: '#f59e0b',
            fillOpacity: 0.8,
            color: '#fff',
            weight: 2
        }).addTo(map).bindPopup(`
            <b>${n.ad}</b><br>
            Yükseklik: ${n.yukseklik || '-'} m<br>
            Tarih: ${n.olcum_tarihi || '-'}
        `);
    });

    showNotification(`${noktalar.length} GPS noktası gösterildi`, 'success');
}

function cikis() {
    localStorage.clear();
    window.location.href = '/';
}

window.onload = initMap;