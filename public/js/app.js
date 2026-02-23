// ============================================
// ANA GİRİŞ NOKTASI (App Entry Point)
// ES6 Module — tüm modülleri import eder
// ============================================

// --- Modül importları ---
import { state } from './modules/state.js';
import { api } from './modules/api.js';
import { showNotification, yeniProjeModal, kapatModal, temizleCizimler, kapatMeasure, cikis } from './modules/ui.js';
import { initMap } from './modules/map-core.js';
import { setTool, haritadanSec, handleMapClick } from './modules/tools.js';
import {
    loadProjeler, projeDegistir, projeOlustur,
    loadTipler, loadCinsler, loadMalzemeler,
    loadDirekler, direkSec, direkSecById, direkTasi,
    hizliDirekEkle, direkEkle, direkGuncelle, direkSil,
    aciklamaKaydet, fotoYukle,
    loadDirekMalzemeler, malzemeEkle, malzemeSil,
    direkAraKeyup, direkAraBtn,
    setHatlariYukleFn
} from './modules/direk.js';
import {
    hatCizimModuBaslat, otomatikHatOlustur, hatlariYukle,
    hatSil, hatDuzenleModal, hatGuncelle,
    zincirlemeHatModuBaslat, zincirlemeBaslat, zincirlemeModuKapat
} from './modules/hat.js';
import { exportExcel, exportKML, malzemeRaporu } from './modules/export.js';
import { topluImportModal, topluImportYap, gpxImportModal, gpxYukle, gpsNoktalariGoster } from './modules/import.js';
import { konumumuGoster, yolTarifiAl } from './modules/location.js';
import { initTheme, toggleTheme } from './modules/theme.js';
import { toggleFilterPanel, applyFilters } from './modules/filter.js';
import { metrajHesapla } from './modules/metraj.js';
import { pdfRaporOlustur } from './modules/pdf-rapor.js';
import { toggleCADMode } from './modules/cad-mode.js';
import { initContextMenu } from './modules/context-menu.js';
import { toggleLayerPanel } from './modules/layer-manager.js';
import { toggleRecentPanel, addRecentAction } from './modules/recent-actions.js';
import { startPolygonSelect, clearPolygon } from './modules/polygon-select.js';
import { initMultiSelect } from './modules/multi-select.js';
import { dxfExport } from './modules/dxf-export.js';
import { maliyetRaporu } from './modules/maliyet.js';
import { checkFirstVisit, startOnboarding } from './modules/onboarding.js';
import { yorumlariGoster, yorumEkle } from './modules/yorumlar.js';
import { islemGecmisiGoster } from './modules/audit.js';
import { excelImportModal, executeExcelImport, downloadExcelTemplate } from './modules/excel-import.js';
import { trafoBolgesiTanimla } from './modules/trafo-zone.js';
import { hatAnaliziYap } from './modules/hat-analiz.js';
import { dxfImportModal, executeDxfImport } from './modules/dxf-import.js';
import { toggleLiveSync } from './modules/live-sync.js';
import { koordinatDonusumAc, koordinatDonusumHaritadan } from './modules/koordinat-donusum.js';
import { malzemeEklePenceresiAc, malzemeEklePenceresiKapat, malzemeTipEkle, createMalzemeEkleModal } from './modules/malzeme-ekle.js';

// --- Circular dependency çözümü ---
setHatlariYukleFn(hatlariYukle);

// --- Auth kontrolü ---
if (!state.token) {
    window.location.href = '/login.html';
}

// --- Kullanıcı bilgisi ---
document.getElementById('userName').textContent = state.user.username;
if (state.user.role === 'admin') {
    document.getElementById('adminLink').style.display = 'inline';
}

// ============================================
// EVENT DELEGATION — data-action handler
// Inline onclick yerine merkezi event sistemi
// ============================================

const actions = {
    // Toolbar
    setTool: (el) => setTool(el.dataset.tool),
    haritadanSec,
    konumumuGoster,
    hatCizimModuBaslat,
    zincirlemeHatModuBaslat,
    otomatikHatOlustur,
    yolTarifiAl,
    gpxImportModal,
    temizleCizimler,

    // Sidebar
    direkEkle,
    direkGuncelle,
    direkSil,
    malzemeEklePenceresiAc,
    malzemeEklePenceresiKapat,
    aciklamaKaydet,

    // Top bar
    projeDegistir,
    yeniProjeModal,
    kapatModal,
    projeOlustur,
    topluImportModal,
    exportExcel,
    exportKML,
    malzemeRaporu,
    direkAraBtn,

    // Misc
    kapatMeasure,
    cikis,
    zincirlemeBaslat,
    topluImportYap,
    gpsNoktalariGoster,

    // Mobile sidebar toggle
    toggleSidebar: () => {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebarOverlay').classList.toggle('active');
    },
    closeSidebar: () => {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');
    },

    // Theme
    toggleTheme,

    // Filter
    toggleFilterPanel,

    // Metraj
    metrajHesapla,

    // PDF
    pdfRaporOlustur,

    // CAD
    toggleCADMode,

    // Layers
    toggleLayerPanel,

    // Recent
    toggleRecentPanel,

    // Polygon
    startPolygonSelect,

    // DXF
    dxfExport,

    // Maliyet
    maliyetRaporu,

    // Onboarding
    startOnboarding,

    // Yorumlar
    yorumlariGoster,

    // Audit
    islemGecmisiGoster,

    // Excel Import
    excelImportModal,

    // Trafo
    trafoBolgesiTanimla,

    // Hat Analiz
    hatAnaliziYap,

    // DXF Import
    dxfImportModal,

    // Live Sync
    toggleLiveSync,

    // Koordinat Dönüşüm
    koordinatDonusum: koordinatDonusumHaritadan,
};

// Click delegation
document.addEventListener('click', (e) => {
    // --- Standart data-action Yönlendirmesi ---
    const el = e.target.closest('[data-action]');
    if (!el) return;

    e.preventDefault();
    const action = el.dataset.action;

    if (actions[action]) {
        actions[action](el);
    }
});

// Change delegation (projeSelect)
document.getElementById('projeSelect').addEventListener('change', projeDegistir);

// Keyup delegation (direk arama)
document.getElementById('direkAraInput').addEventListener('keyup', direkAraKeyup);

// File input delegation (fotoğraf)
document.getElementById('direkFotoInput').addEventListener('change', function () {
    fotoYukle(this);
});

// ============================================
// window BAĞLAMALARI
// Dinamik HTML'den çağrılan fonksiyonlar
// (loadDirekler, hatlariYukle vb. runtime HTML üretir)
// ============================================
window.direkSecById = direkSecById;
window.malzemeSil = malzemeSil;
window._loadDirekMalzemeler = loadDirekMalzemeler;
window.direkSilEvent = direkSil;
window.hatSil = hatSil;
window.hatDuzenleModal = hatDuzenleModal;
window.hatGuncelle = hatGuncelle;
window.gpsNoktalariGoster = gpsNoktalariGoster;
window.zincirlemeBaslat = zincirlemeBaslat;
window.topluImportYap = topluImportYap;
window.gpxYukle = gpxYukle;
window._applyFilters = applyFilters;

// Lightbox
window._openLightbox = function (src) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = `<img src="${src}">`;
    lb.addEventListener('click', () => lb.remove());
    document.body.appendChild(lb);
};

window._clearPolygon = clearPolygon;
window._yorumEkle = yorumEkle;
window._executeExcelImport = executeExcelImport;
window._downloadExcelTemplate = downloadExcelTemplate;
window._executeDxfImport = executeDxfImport;
window._koordinatDonusum = koordinatDonusumHaritadan;

// ============================================
// ELECTRON MENÜ BAĞLAMASI
// Native menüden gelen komutları yönlendir
// ============================================
window._electronMenuAction = function (action) {
    const menuMap = {
        'menu:yeniProje': () => document.querySelector('[data-action="yeniProje"]')?.click(),
        'menu:dxfImport': () => dxfImportModal(),
        'menu:dxfExport': () => dxfExport(),
        'menu:excelImport': () => excelImportModal(),
        'menu:excelExport': () => document.querySelector('[data-action="excelExport"]')?.click(),
        'menu:metraj': () => document.querySelector('[data-action="metrajHesapla"]')?.click(),
        'menu:pdfRapor': () => document.querySelector('[data-action="pdfRaporOlustur"]')?.click(),
        'menu:maliyetRaporu': () => maliyetRaporu(),
        'menu:kmlExport': () => document.querySelector('[data-action="kmlExport"]')?.click(),
        'menu:cadMode': () => toggleCADMode(),
        'menu:hatAnaliz': () => hatAnaliziYap(),
        'menu:polygonSelect': () => startPolygonSelect(),
        'menu:trafoBolge': () => trafoBolgesiTanimla(),
        'menu:haritadanEkle': () => document.querySelector('[data-action="haritadanSecVeEkle"]')?.click(),
        'menu:zincirleme': () => document.querySelector('[data-action="zincirlemeBaslat"]')?.click(),
        'menu:liveSync': () => toggleLiveSync(),
        'menu:katmanlar': () => toggleLayerPanel(),
        'menu:sonIslemler': () => toggleRecentPanel(),
        'menu:auditLog': () => islemGecmisiGoster(),
        'menu:theme': () => document.querySelector('[data-action="toggleTheme"]')?.click(),
        'menu:onboarding': () => startOnboarding(),
    };

    const fn = menuMap[action];
    if (fn) fn();
};

// ============================================
// BAŞLATMA (Initialization)
// ============================================
function init() {
    initTheme();
    initMap();
    initContextMenu();
    initMultiSelect();
    createMalzemeEkleModal();
    checkFirstVisit();

    // Map click handler
    state.map.on('click', function (e) {
        handleMapClick(e.latlng, { hizliDirekEkle });
    });

    // Klavye kısayolları
    document.addEventListener('keydown', function (e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key.toLowerCase()) {
            case 'v': setTool('select'); break;
            case 'a': setTool('add'); break;
            case 'm': setTool('measure'); break;
            case 'escape':
                if (state.zincirlemeHatModu) {
                    zincirlemeModuKapat();
                } else {
                    setTool('select');
                    temizleCizimler();
                }
                break;
        }
    });

    // Verileri yükle
    loadProjeler();
    loadTipler();
    loadCinsler();
    loadMalzemeler();

    // Status bar güncellemeleri
    state.map.on('mousemove', (e) => {
        const c = document.getElementById('statusCoord');
        if (c) c.textContent = `📍 ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
    });
    state.map.on('zoomend', () => {
        const z = document.getElementById('statusZoom');
        if (z) z.textContent = `🔍 Zoom: ${state.map.getZoom()}`;
    });
}

window.onload = init;

// Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('SW registered'))
        .catch(err => console.log('SW failed:', err));
}
