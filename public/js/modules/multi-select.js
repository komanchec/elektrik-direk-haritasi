// ============================================
// ÇOKLU SEÇİM (Multi-Select)
// Shift+tık ile birden fazla direk seç
// ============================================
import { state } from './state.js';
import { showNotification } from './ui.js';
import { direkSil } from './direk.js';

let selectedDirekIds = new Set();

export function getSelectedDireks() {
    return [...selectedDirekIds];
}

export function initMultiSelect() {
    // Shift+Click desteği marker'lara eklenir
    state.map.on('layeradd', (e) => {
        const layer = e.layer;
        if (!layer._icon || !layer.options || !layer.options.icon) return;

        const origClick = layer._events && layer._events.click;

        layer.on('click', (ev) => {
            if (!ev.originalEvent.shiftKey) {
                // Normal tıklama → seçimi temizle
                clearMultiSelect();
                return;
            }

            ev.originalEvent.stopPropagation();

            const markerData = state.markers.find(m => m.marker === layer);
            if (!markerData) return;

            const id = markerData.data.id;

            if (selectedDirekIds.has(id)) {
                selectedDirekIds.delete(id);
                layer.getElement()?.querySelector('.direk-marker')?.classList.remove('multi-selected');
            } else {
                selectedDirekIds.add(id);
                layer.getElement()?.querySelector('.direk-marker')?.classList.add('multi-selected');
            }

            showNotification(`${selectedDirekIds.size} direk seçili`, 'info');
        });
    });
}

export function clearMultiSelect() {
    selectedDirekIds.clear();
    state.markers.forEach(m => {
        m.marker.getElement()?.querySelector('.direk-marker')?.classList.remove('multi-selected');
    });
}

export function deleteSelectedDireks() {
    if (selectedDirekIds.size === 0) {
        showNotification('Önce Shift+tık ile direk seçin', 'warning');
        return;
    }

    if (!confirm(`${selectedDirekIds.size} direk silinecek. Emin misiniz?`)) return;

    // TODO: backend batch delete endpoint gerekir
    showNotification(`${selectedDirekIds.size} direk toplu silme henüz desteklenmiyor`, 'warning');
    clearMultiSelect();
}
