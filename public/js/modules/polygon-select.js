// ============================================
// POLYGON BÖLGE SEÇİMİ
// Çizilen alan içindeki direkleri listele
// ============================================
import { state } from './state.js';
import { showNotification } from './ui.js';

let polygonLayer = null;
let drawingPolygon = false;
let polygonPoints = [];
let tempLines = [];

export function startPolygonSelect() {
    drawingPolygon = true;
    polygonPoints = [];
    tempLines.forEach(l => state.map.removeLayer(l));
    tempLines = [];
    if (polygonLayer) { state.map.removeLayer(polygonLayer); polygonLayer = null; }

    document.getElementById('map').style.cursor = 'crosshair';
    showNotification('Bölge noktalarını tıklayın. Bitirmek için çift tıklayın.', 'info');

    state.map.on('click', onPolygonClick);
    state.map.on('dblclick', onPolygonDblClick);
}

function onPolygonClick(e) {
    if (!drawingPolygon) return;

    polygonPoints.push([e.latlng.lat, e.latlng.lng]);

    // Geçici çizgi
    if (polygonPoints.length > 1) {
        const line = L.polyline([
            polygonPoints[polygonPoints.length - 2],
            polygonPoints[polygonPoints.length - 1]
        ], { color: '#8b5cf6', weight: 2, dashArray: '5,5' }).addTo(state.map);
        tempLines.push(line);
    }

    // Nokta işareti
    L.circleMarker(e.latlng, {
        radius: 5, fillColor: '#8b5cf6', fillOpacity: 1, color: '#fff', weight: 2
    }).addTo(state.map);
}

function onPolygonDblClick(e) {
    if (!drawingPolygon || polygonPoints.length < 3) return;

    drawingPolygon = false;
    state.map.off('click', onPolygonClick);
    state.map.off('dblclick', onPolygonDblClick);
    document.getElementById('map').style.cursor = '';

    // Geçici çizgileri temizle
    tempLines.forEach(l => state.map.removeLayer(l));
    tempLines = [];

    // Polygon çiz
    polygonLayer = L.polygon(polygonPoints, {
        color: '#8b5cf6',
        fillColor: '#8b5cf6',
        fillOpacity: 0.1,
        weight: 2
    }).addTo(state.map);

    // İçindeki direkleri bul
    const inside = [];
    state.markers.forEach(m => {
        const latlng = m.marker.getLatLng();
        if (isPointInPolygon([latlng.lat, latlng.lng], polygonPoints)) {
            inside.push(m.data);
        }
    });

    showPolygonResults(inside);
}

function isPointInPolygon(point, polygon) {
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

function showPolygonResults(direkler) {
    let html = `
        <div style="font-family: 'Segoe UI', sans-serif;">
            <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; padding: 15px; border-radius: 10px; margin-bottom: 15px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold;">${direkler.length}</div>
                <div style="font-size: 12px; opacity: 0.8;">Direk Bulundu</div>
            </div>
    `;

    if (direkler.length > 0) {
        html += `<table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead><tr style="background: #f8fafc;">
                <th style="padding: 8px; text-align: left;">Numara</th>
                <th style="padding: 8px; text-align: left;">Tip</th>
                <th style="padding: 8px; text-align: left;">Cins</th>
            </tr></thead><tbody>`;

        direkler.forEach(d => {
            html += `<tr>
                <td style="padding: 6px 8px; border-top: 1px solid #e2e8f0;"><b>${d.numara}</b></td>
                <td style="padding: 6px 8px; border-top: 1px solid #e2e8f0;">${d.tip_adi}</td>
                <td style="padding: 6px 8px; border-top: 1px solid #e2e8f0;">${d.cins_adi}</td>
            </tr>`;
        });

        html += '</tbody></table>';
    }

    html += `<button onclick="window._clearPolygon()" style="width: 100%; margin-top: 12px; padding: 8px; background: #94a3b8; color: white; border: none; border-radius: 6px; cursor: pointer;">Temizle</button>`;
    html += '</div>';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header">
                <h2>📐 Bölge İçindeki Direkler</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            ${html}
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

export function clearPolygon() {
    if (polygonLayer) { state.map.removeLayer(polygonLayer); polygonLayer = null; }
    tempLines.forEach(l => state.map.removeLayer(l));
    tempLines = [];
    polygonPoints = [];
}
