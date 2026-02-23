// ============================================
// ARAYÜZ YARDIMCILARI (UI Helpers)
// ============================================
import { state } from './state.js';

// CSS Animation inject
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

export function showNotification(message, type = 'info') {
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

export function yeniProjeModal() {
    document.getElementById('projeModal').style.display = 'flex';
    document.getElementById('yeniProjeAd').focus();
}

export function kapatModal() {
    document.getElementById('projeModal').style.display = 'none';
    document.getElementById('yeniProjeAd').value = '';
    document.getElementById('yeniProjeAciklama').value = '';
}

export function temizleCizimler() {
    state.measurePoints = [];
    state.linePoints = [];
    if (state.measureLine) {
        state.map.removeLayer(state.measureLine);
        state.measureLine = null;
    }
    document.getElementById('measureResult').style.display = 'none';

    state.map.eachLayer(layer => {
        if (layer instanceof L.Polyline && !state.polylines.includes(layer)) {
            state.map.removeLayer(layer);
        }
        if (layer instanceof L.CircleMarker && !state.markers.find(m => m.marker === layer)) {
            state.map.removeLayer(layer);
        }
    });

    // setTool import would create circular dep, so we inline
    state.currentTool = 'select';
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    const selectBtn = document.getElementById('toolSelect');
    if (selectBtn) selectBtn.classList.add('active');
    document.getElementById('map').style.cursor = 'default';
}

export function kapatMeasure() {
    document.getElementById('measureResult').style.display = 'none';
    temizleCizimler();
}

export function cikis() {
    localStorage.clear();
    window.location.href = '/';
}
