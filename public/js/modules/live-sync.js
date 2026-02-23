// ============================================
// CANLI İŞBİRLİĞİ — WebSocket Simülasyonu
// Not: Gerçek WebSocket sunucusu ayrıca kurulmalıdır.
// Bu modül polling tabanlı basit bir senkronizasyon sağlar.
// ============================================
import { state } from './state.js';
import { api } from './api.js';
import { showNotification } from './ui.js';

let pollInterval = null;
let lastCheck = Date.now();
let isActive = false;

export function toggleLiveSync() {
    if (isActive) {
        stopLiveSync();
    } else {
        startLiveSync();
    }
}

function startLiveSync() {
    if (!state.currentProject) {
        alert('Önce bir proje seçin!');
        return;
    }

    isActive = true;
    lastCheck = Date.now();

    // Her 10 saniyede kontrol et
    pollInterval = setInterval(checkForUpdates, 10000);

    const btn = document.querySelector('[data-action="toggleLiveSync"]');
    if (btn) {
        btn.style.background = '#16a34a';
        btn.style.color = 'white';
        btn.title = 'Canlı Senkron (Aktif)';
    }

    showLiveBadge(true);
    showNotification('🟢 Canlı senkronizasyon başlatıldı (10s)', 'success');
}

function stopLiveSync() {
    isActive = false;
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }

    const btn = document.querySelector('[data-action="toggleLiveSync"]');
    if (btn) {
        btn.style.background = '';
        btn.style.color = '';
        btn.title = 'Canlı Senkron';
    }

    showLiveBadge(false);
    showNotification('🔴 Canlı senkronizasyon durduruldu', 'info');
}

async function checkForUpdates() {
    if (!state.currentProject) return;

    try {
        const direkler = await api(`/direkler/proje/${state.currentProject}`);
        const currentCount = state.markers.length;

        if (direkler.length !== currentCount) {
            showNotification(
                `🔄 Değişiklik algılandı! (${currentCount} → ${direkler.length} direk)`,
                'info'
            );
            // Sayfayı otomatik yenile
            window.projeDegistir && window.projeDegistir();
        }
    } catch (e) {
        // Sessizce geç
    }
}

function showLiveBadge(show) {
    let badge = document.getElementById('liveSyncBadge');

    if (show && !badge) {
        badge = document.createElement('div');
        badge.id = 'liveSyncBadge';
        badge.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(22, 163, 74, 0.9);
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            z-index: 1500;
            display: flex;
            align-items: center;
            gap: 6px;
            backdrop-filter: blur(10px);
        `;
        badge.innerHTML = `<span style="width: 8px; height: 8px; background: #4ade80; border-radius: 50%; animation: pulseSelect 1s infinite;"></span> CANLI SENKRON`;
        document.body.appendChild(badge);
    } else if (!show && badge) {
        badge.remove();
    }
}
