// ============================================
// TRAFO BÖLGESİ TANIMLAMA
// Hangi trafo hangi direkleri besliyor
// ============================================
import { state } from './state.js';
import { showNotification } from './ui.js';

let trafoBolgeleri = [];
let drawingTrafoZone = false;
let zonePoints = [];
let tempZoneLines = [];

export function trafoBolgesiTanimla() {
    // Trafo direkleri listele
    const trafoDirekler = state.markers.filter(m =>
        m.data.cins_adi && m.data.cins_adi.toLowerCase().includes('trafo')
    );

    if (trafoDirekler.length === 0) {
        // Manuel mod
        showNotification('Trafo bölgesi çizmek için haritaya noktalar ekleyin. Çift tıkla bitirin.', 'info');
        startZoneDraw();
        return;
    }

    // Trafo seçim modali
    let html = `
        <div style="font-family: 'Segoe UI', sans-serif;">
            <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 15px; border-radius: 10px; margin-bottom: 15px; text-align: center;">
                <div style="font-size: 14px; font-weight: 600;">⚡ Trafo Bölgesi Tanımla</div>
                <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">Trafo seçin veya yeni bölge çizin</div>
            </div>

            <h4 style="font-size: 13px; margin-bottom: 8px;">Mevcut Trafolar:</h4>
    `;

    trafoDirekler.forEach(t => {
        html += `
            <div onclick="window._selectTrafoForZone(${t.data.id}, '${t.data.numara}')" 
                 style="padding: 10px; margin: 5px 0; background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">⚡</span>
                <div>
                    <div style="font-weight: 600; font-size: 13px;">${t.data.numara}</div>
                    <div style="font-size: 11px; color: #92400e;">${t.data.tip_adi}</div>
                </div>
            </div>
        `;
    });

    html += `
        <button onclick="window._manualTrafoZone(); this.closest('.modal').remove();" 
            style="width: 100%; margin-top: 12px; padding: 10px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer;">
            ✏️ Manuel Bölge Çiz
        </button>
    `;

    html += '</div>';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h2>⚡ Trafo Bölgeleri</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            ${html}
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function startZoneDraw(trafoId, trafoNumara) {
    drawingTrafoZone = true;
    zonePoints = [];
    document.getElementById('map').style.cursor = 'crosshair';

    state.map.on('click', onZoneClick);
    state.map.on('dblclick', (e) => onZoneDblClick(e, trafoId, trafoNumara));
}

function onZoneClick(e) {
    if (!drawingTrafoZone) return;
    zonePoints.push([e.latlng.lat, e.latlng.lng]);

    if (zonePoints.length > 1) {
        const line = L.polyline([zonePoints[zonePoints.length - 2], zonePoints[zonePoints.length - 1]], {
            color: '#f59e0b', weight: 2, dashArray: '5,5'
        }).addTo(state.map);
        tempZoneLines.push(line);
    }

    L.circleMarker(e.latlng, {
        radius: 4, fillColor: '#f59e0b', fillOpacity: 1, color: '#fff', weight: 2
    }).addTo(state.map);
}

function onZoneDblClick(e, trafoId, trafoNumara) {
    if (!drawingTrafoZone || zonePoints.length < 3) return;

    drawingTrafoZone = false;
    state.map.off('click', onZoneClick);
    state.map.off('dblclick');
    document.getElementById('map').style.cursor = '';

    tempZoneLines.forEach(l => state.map.removeLayer(l));
    tempZoneLines = [];

    // Polygon çiz
    const zone = L.polygon(zonePoints, {
        color: '#f59e0b',
        fillColor: '#fbbf24',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '8,4'
    }).addTo(state.map);

    // İçindeki direkler
    const direklerInZone = [];
    state.markers.forEach(m => {
        const ll = m.marker.getLatLng();
        if (isInsidePolygon([ll.lat, ll.lng], zonePoints)) {
            direklerInZone.push(m.data);
        }
    });

    const label = trafoNumara || `Bölge ${trafoBolgeleri.length + 1}`;

    zone.bindPopup(`
        <div style="font-family: 'Segoe UI', sans-serif; min-width: 180px;">
            <b>⚡ ${label}</b><br>
            <span style="font-size: 12px; color: #64748b;">${direklerInZone.length} direk bu bölgede</span>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 8px 0;">
            ${direklerInZone.map(d => `<div style="font-size: 11px;">📍 ${d.numara}</div>`).join('')}
        </div>
    `);

    trafoBolgeleri.push({ zone, trafoId, label, direkler: direklerInZone });

    showNotification(`⚡ ${label} — ${direklerInZone.length} direk bu bölgede`, 'success');
}

function isInsidePolygon(point, polygon) {
    let inside = false;
    const [x, y] = point;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Window bindings
window._selectTrafoForZone = function (id, numara) {
    document.querySelector('.modal')?.remove();
    showNotification(`${numara} için bölge çizin. Çift tıkla bitirin.`, 'info');
    startZoneDraw(id, numara);
};

window._manualTrafoZone = function () {
    showNotification('Bölge noktalarını tıklayın. Çift tıkla bitirin.', 'info');
    startZoneDraw();
};
