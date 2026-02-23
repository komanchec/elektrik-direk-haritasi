// ============================================
// RING / RADYAL HAT ANALİZİ
// Hat topolojisi analizi — döngü tespiti
// ============================================
import { state } from './state.js';
import { api } from './api.js';

export async function hatAnaliziYap() {
    if (!state.currentProject) {
        alert('Önce bir proje seçin!');
        return;
    }

    const direkler = await api(`/direkler/proje/${state.currentProject}`);
    const hatlar = await api(`/direkler/proje/${state.currentProject}/hatlar`);

    // Graf oluştur (adjacency list)
    const graf = {};
    const edges = [];

    direkler.forEach(d => { graf[d.id] = []; });

    hatlar.forEach(h => {
        const d1 = direkler.find(d => d.numara === h.direk1_numara);
        const d2 = direkler.find(d => d.numara === h.direk2_numara);
        if (d1 && d2) {
            graf[d1.id] = graf[d1.id] || [];
            graf[d2.id] = graf[d2.id] || [];
            graf[d1.id].push(d2.id);
            graf[d2.id].push(d1.id);
            edges.push({ from: d1, to: d2, hat: h });
        }
    });

    // DFS ile döngü tespiti
    const visited = new Set();
    const ringNodes = new Set();
    const parent = {};
    let hasRing = false;

    function dfs(node, par) {
        visited.add(node);
        parent[node] = par;

        for (const neighbor of (graf[node] || [])) {
            if (!visited.has(neighbor)) {
                dfs(neighbor, node);
            } else if (neighbor !== par) {
                // Döngü bulundu!
                hasRing = true;
                let curr = node;
                let safety = 0;
                while (curr !== neighbor && curr !== undefined && curr !== -1 && safety < 1000) {
                    ringNodes.add(curr);
                    curr = parent[curr];
                    safety++;
                }
                if (curr === neighbor) ringNodes.add(neighbor);
            }
        }
    }

    // Bağlantı bileşenlerini bul
    const components = [];
    const allNodes = Object.keys(graf).map(Number);
    const componentVisited = new Set();

    allNodes.forEach(node => {
        if (!componentVisited.has(node)) {
            const component = [];
            const queue = [node];
            componentVisited.add(node);

            while (queue.length) {
                const curr = queue.shift();
                component.push(curr);
                for (const n of (graf[curr] || [])) {
                    if (!componentVisited.has(n)) {
                        componentVisited.add(n);
                        queue.push(n);
                    }
                }
            }
            components.push(component);
        }
    });

    // DFS ring tespiti
    allNodes.forEach(node => {
        if (!visited.has(node)) dfs(node, -1);
    });

    // Derece analizi
    const ucNoktalari = []; // degree=1
    const kavsaklar = [];    // degree>=3

    allNodes.forEach(node => {
        const degree = (graf[node] || []).length;
        if (degree === 1) ucNoktalari.push(node);
        if (degree >= 3) kavsaklar.push(node);
    });

    // Sonuçları göster
    const direkMap = {};
    direkler.forEach(d => direkMap[d.id] = d);

    let html = `
        <div style="font-family: 'Segoe UI', sans-serif;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <div style="background: ${hasRing ? '#fef2f2' : '#f0fdf4'}; padding: 15px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 24px;">${hasRing ? '🔄' : '📡'}</div>
                    <div style="font-size: 14px; font-weight: bold; color: ${hasRing ? '#dc2626' : '#16a34a'};">
                        ${hasRing ? 'RING' : 'RADYAL'}
                    </div>
                    <div style="font-size: 11px; color: #64748b;">Hat Topolojisi</div>
                </div>
                <div style="background: #f0f9ff; padding: 15px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #0369a1;">${components.length}</div>
                    <div style="font-size: 11px; color: #64748b;">Bağımsız Ağ</div>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <tr style="background: #f8fafc;">
                    <td style="padding: 8px;">Toplam Direk</td>
                    <td style="padding: 8px; text-align: right; font-weight: 600;">${direkler.length}</td>
                </tr>
                <tr>
                    <td style="padding: 8px;">Toplam Hat</td>
                    <td style="padding: 8px; text-align: right; font-weight: 600;">${hatlar.length}</td>
                </tr>
                <tr style="background: #f8fafc;">
                    <td style="padding: 8px;">Uç Noktaları (derece=1)</td>
                    <td style="padding: 8px; text-align: right; font-weight: 600;">${ucNoktalari.length}</td>
                </tr>
                <tr>
                    <td style="padding: 8px;">Kavşaklar (derece≥3)</td>
                    <td style="padding: 8px; text-align: right; font-weight: 600;">${kavsaklar.length}</td>
                </tr>
                ${hasRing ? `<tr style="background: #fef2f2;">
                    <td style="padding: 8px; color: #dc2626;">Ring Düğümleri</td>
                    <td style="padding: 8px; text-align: right; font-weight: 600; color: #dc2626;">${ringNodes.size}</td>
                </tr>` : ''}
            </table>

            ${ucNoktalari.length > 0 ? `
                <h4 style="font-size: 12px; margin: 12px 0 5px;">🔚 Uç Noktaları:</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                    ${ucNoktalari.map(n => {
        const d = direkMap[n];
        return d ? `<span style="padding: 3px 8px; background: #fef3c7; border-radius: 4px; font-size: 11px;">${d.numara}</span>` : '';
    }).join('')}
                </div>
            ` : ''}

            ${kavsaklar.length > 0 ? `
                <h4 style="font-size: 12px; margin: 12px 0 5px;">🔀 Kavşaklar:</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                    ${kavsaklar.map(n => {
        const d = direkMap[n];
        return d ? `<span style="padding: 3px 8px; background: #dbeafe; border-radius: 4px; font-size: 11px;">${d.numara}</span>` : '';
    }).join('')}
                </div>
            ` : ''}
        </div>
    `;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header">
                <h2>🔍 Hat Topoloji Analizi</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            ${html}
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Haritada ring nodlarını vurgula
    if (hasRing) {
        ringNodes.forEach(nodeId => {
            const m = state.markers.find(mk => mk.data.id === nodeId);
            if (m) {
                L.circleMarker(m.marker.getLatLng(), {
                    radius: 15,
                    color: '#dc2626',
                    fillColor: '#fca5a5',
                    fillOpacity: 0.3,
                    weight: 3,
                    dashArray: '5,5'
                }).addTo(state.map);
            }
        });
    }
}
