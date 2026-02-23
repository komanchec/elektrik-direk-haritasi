// ============================================
// CAD MODU — Harita altlığını gizle/göster
// Aynı harita, aynı veriler. Sadece tile açık/kapalı.
// ============================================
import { state } from './state.js';
import { showNotification } from './ui.js';

let gridLayer = null;
let tileLayersVisible = true;

// Grid çizgileri oluştur (CAD arka plan)
function createGrid() {
    if (gridLayer) {
        state.map.removeLayer(gridLayer);
        gridLayer = null;
    }

    const lines = [];
    const bounds = state.map.getBounds();
    const zoom = state.map.getZoom();

    // Zoom seviyesine göre grid aralığı
    let step;
    if (zoom >= 18) step = 0.0001;       // ~10m
    else if (zoom >= 16) step = 0.0005;  // ~50m
    else if (zoom >= 14) step = 0.001;   // ~100m
    else if (zoom >= 12) step = 0.005;   // ~500m
    else if (zoom >= 10) step = 0.01;    // ~1km
    else step = 0.05;                     // ~5km

    const south = Math.floor(bounds.getSouth() / step) * step;
    const north = Math.ceil(bounds.getNorth() / step) * step;
    const west = Math.floor(bounds.getWest() / step) * step;
    const east = Math.ceil(bounds.getEast() / step) * step;

    // Yatay çizgiler
    for (let lat = south; lat <= north; lat += step) {
        lines.push(L.polyline([[lat, west], [lat, east]], {
            color: '#cbd5e1',
            weight: 0.5,
            opacity: 0.6,
            interactive: false
        }));
    }

    // Dikey çizgiler
    for (let lng = west; lng <= east; lng += step) {
        lines.push(L.polyline([[south, lng], [north, lng]], {
            color: '#cbd5e1',
            weight: 0.5,
            opacity: 0.6,
            interactive: false
        }));
    }

    // Ana eksenler (daha kalın)
    const mainStep = step * 5;
    for (let lat = Math.floor(south / mainStep) * mainStep; lat <= north; lat += mainStep) {
        lines.push(L.polyline([[lat, west], [lat, east]], {
            color: '#94a3b8',
            weight: 1,
            opacity: 0.5,
            interactive: false
        }));
    }
    for (let lng = Math.floor(west / mainStep) * mainStep; lng <= east; lng += mainStep) {
        lines.push(L.polyline([[south, lng], [north, lng]], {
            color: '#94a3b8',
            weight: 1,
            opacity: 0.5,
            interactive: false
        }));
    }

    gridLayer = L.layerGroup(lines).addTo(state.map);
    gridLayer.setZIndex(-100);
}

// Tile katmanlarını sakla
let savedTileLayers = [];

export function toggleCADMode() {
    const mapDiv = document.getElementById('map');
    const cadBtn = document.querySelector('[data-action="toggleCADMode"]');

    if (tileLayersVisible) {
        // --- CAD MODUNA GEÇ ---
        // Tile layer'ları gizle
        savedTileLayers = [];
        state.map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) {
                savedTileLayers.push(layer);
                state.map.removeLayer(layer);
            }
        });

        // Beyaz arka plan
        mapDiv.style.background = '#f8fafc';

        // Grid oluştur
        createGrid();

        // Zoom/pan'da grid güncelle
        state.map.on('moveend', updateGridOnMove);
        state.map.on('zoomend', updateGridOnMove);

        tileLayersVisible = false;
        if (cadBtn) {
            cadBtn.style.background = '#3b82f6';
            cadBtn.style.color = '#fff';
            cadBtn.title = 'Harita Moduna Dön';
            cadBtn.textContent = '🗺️';
        }

        showNotification('📐 CAD Modu — Harita altlığı gizlendi', 'info');

    } else {
        // --- HARİTA MODUNA DÖN ---
        // Grid kaldır
        if (gridLayer) {
            state.map.removeLayer(gridLayer);
            gridLayer = null;
        }

        state.map.off('moveend', updateGridOnMove);
        state.map.off('zoomend', updateGridOnMove);

        // Tile'ları geri ekle
        savedTileLayers.forEach(layer => layer.addTo(state.map));
        savedTileLayers = [];

        // Normal arka plan
        mapDiv.style.background = '';

        tileLayersVisible = true;
        if (cadBtn) {
            cadBtn.style.background = '';
            cadBtn.style.color = '';
            cadBtn.title = 'CAD Modu';
            cadBtn.textContent = '📐';
        }

        showNotification('🗺️ Harita Modu — Altlık gösteriliyor', 'info');
    }
}

function updateGridOnMove() {
    if (!tileLayersVisible) {
        createGrid();
    }
}

export function isCADMode() {
    return !tileLayersVisible;
}
