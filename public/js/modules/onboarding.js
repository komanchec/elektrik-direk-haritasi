// ============================================
// ONBOARDING TURU
// İlk girişte adım adım yönlendirme
// ============================================
import { showNotification } from './ui.js';

const ONBOARDING_KEY = 'onboardingDone';

const steps = [
    {
        target: '#projeSelect',
        title: '📁 Proje Seçimi',
        text: 'Buradan çalışacağınız projeyi seçin veya yeni proje oluşturun.',
        position: 'bottom'
    },
    {
        target: '.tool-btn[data-action="haritadanSecVeEkle"]',
        title: '📍 Direk Ekleme',
        text: 'Bu butona basıp haritaya tıklayarak hızlıca direk ekleyin.',
        position: 'left'
    },
    {
        target: '.tool-btn[data-action="toggleCADMode"]',
        title: '📐 CAD Modu',
        text: 'Harita altlığını gizleyip teknik çizim görünümüne geçin.',
        position: 'left'
    },
    {
        target: '.tool-btn[data-action="toggleLayerPanel"]',
        title: '🗂️ Katmanlar',
        text: 'Direkler, hatlar ve etiketleri ayrı ayrı göster/gizle.',
        position: 'left'
    },
    {
        target: '[data-action="metrajHesapla"]',
        title: '📐 Metraj',
        text: 'Projedeki tüm kablo metrajlarını iletken tipine göre görün.',
        position: 'bottom'
    }
];

let currentStep = 0;
let overlay = null;

export function startOnboarding() {
    currentStep = 0;
    showStep();
}

export function checkFirstVisit() {
    if (!localStorage.getItem(ONBOARDING_KEY)) {
        setTimeout(() => startOnboarding(), 1500);
    }
}

function showStep() {
    removeOverlay();

    if (currentStep >= steps.length) {
        localStorage.setItem(ONBOARDING_KEY, 'true');
        showNotification('Tur tamamlandı! İyi çalışmalar 🎉', 'success');
        return;
    }

    const step = steps[currentStep];
    const target = document.querySelector(step.target);

    overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';

    let top = '50%', left = '50%';
    if (target) {
        const rect = target.getBoundingClientRect();
        target.style.position = 'relative';
        target.style.zIndex = '2001';
        target.style.outline = '3px solid #3b82f6';
        target.style.borderRadius = '8px';

        switch (step.position) {
            case 'bottom':
                top = (rect.bottom + 15) + 'px';
                left = rect.left + 'px';
                break;
            case 'left':
                top = rect.top + 'px';
                left = (rect.left - 290) + 'px';
                break;
            case 'right':
                top = rect.top + 'px';
                left = (rect.right + 15) + 'px';
                break;
        }
    }

    overlay.innerHTML = `
        <div class="onboarding-backdrop" onclick="window._skipOnboarding()"></div>
        <div class="onboarding-tooltip" style="top: ${top}; left: ${left};">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">${step.title}</div>
            <div style="font-size: 13px; color: #475569; margin-bottom: 12px;">${step.text}</div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; color: #94a3b8;">${currentStep + 1} / ${steps.length}</span>
                <div style="display: flex; gap: 8px;">
                    <button onclick="window._skipOnboarding()" style="padding: 6px 12px; background: #94a3b8; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">Atla</button>
                    <button onclick="window._nextOnboarding()" style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        ${currentStep < steps.length - 1 ? 'Sonraki →' : 'Bitir ✓'}
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
}

function removeOverlay() {
    if (overlay) {
        overlay.remove();
        overlay = null;
    }
    // Reset z-index
    document.querySelectorAll('[style*="z-index: 2001"]').forEach(el => {
        el.style.zIndex = '';
        el.style.outline = '';
    });
}

window._nextOnboarding = function () {
    currentStep++;
    showStep();
};

window._skipOnboarding = function () {
    removeOverlay();
    localStorage.setItem(ONBOARDING_KEY, 'true');
};
