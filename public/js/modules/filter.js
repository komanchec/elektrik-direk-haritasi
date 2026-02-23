// ============================================
// HARİTA FİLTRELEME (Tip/Cins bazlı)
// ============================================
import { state } from './state.js';

let filterPanel = null;

export function toggleFilterPanel() {
    if (filterPanel) {
        filterPanel.remove();
        filterPanel = null;
        return;
    }

    const tipler = new Set();
    const cinsler = new Set();

    state.markers.forEach(m => {
        if (m.data) {
            tipler.add(m.data.tip_adi || 'Bilinmiyor');
            cinsler.add(m.data.cins_adi || 'Bilinmiyor');
        }
    });

    let html = `
        <div id="filterPanel" style="
            position: absolute; top: 80px; right: 70px;
            background: white; padding: 15px; border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 1000;
            min-width: 220px; max-height: 400px; overflow-y: auto;
        ">
            <h4 style="margin-bottom: 10px; color: #1e293b; font-size: 14px;">🔽 Filtrele</h4>
            <p style="font-size: 11px; color: #64748b; margin-bottom: 8px;">Direk Tipi</p>
    `;

    tipler.forEach(tip => {
        html += `<label style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-size: 13px; color: #334155; cursor: pointer;">
            <input type="checkbox" checked data-filter-type="tip" data-filter-value="${tip}" onchange="window._applyFilters()"> ${tip}
        </label>`;
    });

    html += `<p style="font-size: 11px; color: #64748b; margin: 10px 0 8px;">Direk Cinsi</p>`;

    cinsler.forEach(cins => {
        html += `<label style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-size: 13px; color: #334155; cursor: pointer;">
            <input type="checkbox" checked data-filter-type="cins" data-filter-value="${cins}" onchange="window._applyFilters()"> ${cins}
        </label>`;
    });

    const total = state.markers.length;
    html += `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
        Gösterilen: <span id="filterCount">${total}</span> / ${total}
    </div>`;

    html += `</div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    filterPanel = document.getElementById('filterPanel');
}

export function applyFilters() {
    const tipCheckboxes = document.querySelectorAll('[data-filter-type="tip"]');
    const cinsCheckboxes = document.querySelectorAll('[data-filter-type="cins"]');

    const activeTipler = new Set();
    const activeCinsler = new Set();

    tipCheckboxes.forEach(cb => { if (cb.checked) activeTipler.add(cb.dataset.filterValue); });
    cinsCheckboxes.forEach(cb => { if (cb.checked) activeCinsler.add(cb.dataset.filterValue); });

    let shown = 0;

    state.markers.forEach(m => {
        if (!m.data) return;
        const tip = m.data.tip_adi || 'Bilinmiyor';
        const cins = m.data.cins_adi || 'Bilinmiyor';

        const visible = activeTipler.has(tip) && activeCinsler.has(cins);

        if (visible) {
            if (!state.map.hasLayer(m.marker)) state.map.addLayer(m.marker);
            shown++;
        } else {
            if (state.map.hasLayer(m.marker)) state.map.removeLayer(m.marker);
        }
    });

    const countEl = document.getElementById('filterCount');
    if (countEl) countEl.textContent = shown;
}
