// ============================================
// HARİTA BAŞLATMA (Map Core)
// ============================================
import { state } from './state.js';

export function initMap() {
    state.map = L.map('map', {
        center: [39.9334, 32.8597],
        zoom: 6,
        zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(state.map);

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri',
        maxZoom: 19
    });

    const baseMaps = {
        "Harita": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
        "Uydu": satelliteLayer,
        "Topografik": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png')
    };

    L.control.layers(baseMaps).addTo(state.map);
    L.control.scale().addTo(state.map);
}
