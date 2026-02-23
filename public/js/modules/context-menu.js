// ============================================
// SAĞ TIK CONTEXT MENÜ
// ============================================
import { state } from './state.js';
import { direkSec, direkSil, direkGuncelle } from './direk.js';
import { hatCizimModuBaslat } from './hat.js';
import { showNotification } from './ui.js';

let activeMenu = null;

function removeMenu() {
    if (activeMenu) {
        activeMenu.remove();
        activeMenu = null;
    }
}

// Global click ile menü kapat
document.addEventListener('click', removeMenu);

export function initContextMenu() {
    // Her marker'a sağ tık ekle
    state.map.on('layeradd', (e) => {
        const layer = e.layer;
        if (layer._icon && layer.options && layer.options.icon) {
            layer.on('contextmenu', (ev) => {
                ev.originalEvent.preventDefault();

                const markerData = state.markers.find(m => m.marker === layer);
                if (!markerData) return;

                showDirekContextMenu(ev.originalEvent, markerData.data, layer);
            });
        }
    });

    // Harita sağ tık
    state.map.on('contextmenu', (e) => {
        showMapContextMenu(e.originalEvent, e.latlng);
    });
}

function showDirekContextMenu(event, direk, marker) {
    removeMenu();
    event.stopPropagation();

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';

    menu.innerHTML = `
        <div class="context-menu-item" data-action="ctx-select">📍 Seç — ${direk.numara}</div>
        <div class="context-menu-item" data-action="ctx-edit">✏️ Düzenle</div>
        <div class="context-menu-item" data-action="ctx-hat">🔗 Hat Çiz</div>
        <div class="context-menu-item" data-action="ctx-copy-coord">📋 Koordinat Kopyala</div>
        <div class="context-menu-sep"></div>
        <div class="context-menu-item danger" data-action="ctx-delete">🗑️ Sil</div>
    `;

    document.body.appendChild(menu);
    activeMenu = menu;

    // Eylemler
    menu.addEventListener('click', (e) => {
        const item = e.target.closest('.context-menu-item');
        if (!item) return;

        const action = item.dataset.action;
        removeMenu();

        switch (action) {
            case 'ctx-select':
                direkSec(direk, marker);
                break;
            case 'ctx-edit':
                direkSec(direk, marker);
                break;
            case 'ctx-hat':
                direkSec(direk, marker);
                hatCizimModuBaslat();
                break;
            case 'ctx-copy-coord':
                navigator.clipboard.writeText(`${direk.lat}, ${direk.lng}`);
                showNotification('Koordinat kopyalandı', 'success');
                break;
            case 'ctx-delete':
                if (confirm(`${direk.numara} silinecek. Emin misiniz?`)) {
                    direkSec(direk, marker);
                    direkSil();
                }
                break;
        }
    });

    // Ekrandan taşma kontrolü
    setTimeout(() => {
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) menu.style.left = (event.pageX - rect.width) + 'px';
        if (rect.bottom > window.innerHeight) menu.style.top = (event.pageY - rect.height) + 'px';
    }, 0);
}

function showMapContextMenu(event, latlng) {
    removeMenu();
    event.preventDefault();
    event.stopPropagation();

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';

    menu.innerHTML = `
        <div class="context-menu-item" data-action="ctx-add-here">📍 Buraya Direk Ekle</div>
        <div class="context-menu-item" data-action="ctx-measure-here">📏 Ölçüm Noktası</div>
        <div class="context-menu-item" data-action="ctx-copy-latlng">📋 Koordinat Kopyala</div>
    `;

    document.body.appendChild(menu);
    activeMenu = menu;

    menu.addEventListener('click', (e) => {
        const item = e.target.closest('.context-menu-item');
        if (!item) return;

        const action = item.dataset.action;
        removeMenu();

        switch (action) {
            case 'ctx-add-here':
                document.getElementById('enlem').value = latlng.lat.toFixed(10);
                document.getElementById('boylam').value = latlng.lng.toFixed(10);
                showNotification('Koordinatlar forma yazıldı. Direk Ekle butonuna basın.', 'info');
                break;
            case 'ctx-measure-here':
                state.currentTool = 'measure';
                state.measurePoints.push([latlng.lat, latlng.lng]);
                L.circleMarker([latlng.lat, latlng.lng], {
                    radius: 8, fillColor: '#ef4444', fillOpacity: 1, color: '#fff', weight: 2
                }).addTo(state.map);
                showNotification('Ölçüm noktası eklendi', 'info');
                break;
            case 'ctx-copy-latlng':
                navigator.clipboard.writeText(`${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`);
                showNotification('Koordinat kopyalandı', 'success');
                break;
        }
    });
}
