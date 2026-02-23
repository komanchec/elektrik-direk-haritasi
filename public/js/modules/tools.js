// ============================================
// ARAÇ YÖNETİMİ (Tool Management)
// ============================================
import { state } from './state.js';
import { showNotification } from './ui.js';

export function setTool(tool) {
    state.currentTool = tool;
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

export function haritadanSec() {
    setTool('add');
    showNotification('Haritaya tıklayarak direk ekleyin', 'info');
}

// handleMapClick: hizliDirekEkle ve zincirlemeHatTiklama dışarıdan inject edilir.
// Bu fonksiyon app.js tarafından map click handler olarak kurulur.
export function handleMapClick(latlng, { hizliDirekEkle, zincirlemeHatTiklama } = {}) {
    const lat = latlng.lat;
    const lng = latlng.lng;

    if (state.currentTool === 'add') {
        if (hizliDirekEkle) hizliDirekEkle(lat, lng);
    } else if (state.currentTool === 'measure') {
        state.measurePoints.push([lat, lng]);

        L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: '#ef4444',
            fillOpacity: 1,
            color: '#fff',
            weight: 2
        }).addTo(state.map).bindPopup('Nokta ' + state.measurePoints.length).openPopup();

        if (state.measurePoints.length === 2) {
            if (state.measureLine) state.map.removeLayer(state.measureLine);

            state.measureLine = L.polyline(state.measurePoints, {
                color: '#ef4444',
                weight: 4,
                dashArray: '10, 10'
            }).addTo(state.map);

            const mesafe = state.map.distance(state.measurePoints[0], state.measurePoints[1]);

            document.getElementById('measureDistance').textContent = mesafe.toFixed(2);
            document.getElementById('measureResult').style.display = 'block';

            L.popup()
                .setLatLng([(state.measurePoints[0][0] + state.measurePoints[1][0]) / 2, (state.measurePoints[0][1] + state.measurePoints[1][1]) / 2])
                .setContent(`<b>Mesafe:</b> ${mesafe.toFixed(2)} m`)
                .openOn(state.map);
        }
    }
}
