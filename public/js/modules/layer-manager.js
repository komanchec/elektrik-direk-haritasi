// ============================================
// KATMAN YÖNETİMİ (Layer Management)
// Direkler/Hatlar/Etiketler ayrı ayrı aç-kapa
// ============================================
import { state } from './state.js';

let layerPanel = null;
let layerStates = {
    direkler: true,
    hatlar: true,
    etiketler: true
};

export function toggleLayerPanel() {
    if (layerPanel) {
        layerPanel.remove();
        layerPanel = null;
        return;
    }

    const html = `
        <div class="layer-panel" id="layerPanel">
            <h4>🗂️ Katmanlar</h4>
            <label class="layer-item">
                <input type="checkbox" ${layerStates.direkler ? 'checked' : ''} data-layer="direkler">
                📍 Direkler
            </label>
            <label class="layer-item">
                <input type="checkbox" ${layerStates.hatlar ? 'checked' : ''} data-layer="hatlar">
                🔗 Hatlar
            </label>
            <label class="layer-item">
                <input type="checkbox" ${layerStates.etiketler ? 'checked' : ''} data-layer="etiketler">
                🏷️ Etiketler
            </label>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    layerPanel = document.getElementById('layerPanel');

    layerPanel.addEventListener('change', (e) => {
        const input = e.target;
        if (!input.dataset.layer) return;

        const layer = input.dataset.layer;
        layerStates[layer] = input.checked;
        applyLayerVisibility(layer, input.checked);
    });
}

function applyLayerVisibility(layer, visible) {
    switch (layer) {
        case 'direkler':
            state.markers.forEach(m => {
                if (visible) {
                    if (!state.map.hasLayer(m.marker)) state.map.addLayer(m.marker);
                } else {
                    if (state.map.hasLayer(m.marker)) state.map.removeLayer(m.marker);
                }
            });
            break;
        case 'hatlar':
            state.polylines.forEach(p => {
                if (visible) {
                    if (!state.map.hasLayer(p)) state.map.addLayer(p);
                } else {
                    if (state.map.hasLayer(p)) state.map.removeLayer(p);
                }
            });
            break;
        case 'etiketler':
            if (state.hatLabels) {
                state.hatLabels.forEach(l => {
                    if (visible) {
                        if (!state.map.hasLayer(l)) state.map.addLayer(l);
                    } else {
                        if (state.map.hasLayer(l)) state.map.removeLayer(l);
                    }
                });
            }
            break;
    }
}
