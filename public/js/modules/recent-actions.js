// ============================================
// SON İŞLEMLER PANELİ
// ============================================

const MAX_ACTIONS = 15;
const actions = [];
let panel = null;
let panelVisible = false;

export function addRecentAction(icon, text) {
    const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    actions.unshift({ icon, text, time });
    if (actions.length > MAX_ACTIONS) actions.pop();
    renderPanel();
}

export function toggleRecentPanel() {
    panelVisible = !panelVisible;
    if (panelVisible) {
        renderPanel();
    } else if (panel) {
        panel.remove();
        panel = null;
    }
}

function renderPanel() {
    if (!panelVisible) return;

    if (panel) panel.remove();

    if (actions.length === 0) return;

    const el = document.createElement('div');
    el.className = 'recent-actions';
    el.id = 'recentPanel';

    let html = '<h5>Son İşlemler</h5>';
    actions.forEach(a => {
        html += `<div class="recent-action-item">
            <span class="recent-action-time">${a.time}</span>
            <span>${a.icon} ${a.text}</span>
        </div>`;
    });

    el.innerHTML = html;
    document.body.appendChild(el);
    panel = el;
}
