// ============================================
// KABLO METRAJ HESABI
// Projedeki tüm hatların iletken tipine göre
// toplam metraj hesabı
// ============================================
import { state } from './state.js';
import { api } from './api.js';

export async function metrajHesapla() {
    if (!state.currentProject) {
        alert('Önce bir proje seçin!');
        return;
    }

    const hatlar = await api(`/direkler/proje/${state.currentProject}/hatlar`);

    if (!hatlar || hatlar.length === 0) {
        alert('Bu projede henüz hat bulunmuyor.');
        return;
    }

    // İletken tipi + kesit bazında gruplama
    const gruplar = {};
    let genelToplam = 0;

    hatlar.forEach(h => {
        const tip = h.iletken_tipi || 'Bilinmiyor';
        const kesit = h.kesit_mm2 || '-';
        const cins = h.iletken_cinsi || '';
        const mesafe = h.mesafe_metre || 0;
        const key = `${tip}|${kesit}|${cins}`;

        if (!gruplar[key]) {
            gruplar[key] = { tip, kesit, cins, toplam: 0, hatSayisi: 0 };
        }
        gruplar[key].toplam += mesafe;
        gruplar[key].hatSayisi++;
        genelToplam += mesafe;
    });

    // UI oluştur
    let html = `
        <div style="font-family: 'Segoe UI', sans-serif;">
            <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: center;">
                <div style="font-size: 14px; opacity: 0.8;">Toplam Kablo Metrajı</div>
                <div style="font-size: 36px; font-weight: bold; margin: 8px 0;">${(genelToplam).toFixed(1)} m</div>
                <div style="font-size: 13px; opacity: 0.7;">${(genelToplam / 1000).toFixed(3)} km · ${hatlar.length} hat</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: #f1f5f9;">
                        <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0;">İletken Tipi</th>
                        <th style="text-align: center; padding: 10px; border-bottom: 2px solid #e2e8f0;">Kesit</th>
                        <th style="text-align: center; padding: 10px; border-bottom: 2px solid #e2e8f0;">Hat Sayısı</th>
                        <th style="text-align: right; padding: 10px; border-bottom: 2px solid #e2e8f0;">Metraj (m)</th>
                    </tr>
                </thead>
                <tbody>
    `;

    Object.values(gruplar)
        .sort((a, b) => b.toplam - a.toplam)
        .forEach(g => {
            const yuzde = ((g.toplam / genelToplam) * 100).toFixed(1);
            html += `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
                        <strong>${g.tip}</strong>
                        ${g.cins ? `<span style="color: #64748b; font-size: 11px;"> (${g.cins})</span>` : ''}
                    </td>
                    <td style="text-align: center; padding: 10px; border-bottom: 1px solid #e2e8f0;">${g.kesit} mm²</td>
                    <td style="text-align: center; padding: 10px; border-bottom: 1px solid #e2e8f0;">${g.hatSayisi}</td>
                    <td style="text-align: right; padding: 10px; border-bottom: 1px solid #e2e8f0;">
                        <strong>${g.toplam.toFixed(1)}</strong>
                        <span style="color: #64748b; font-size: 11px;"> (${yuzde}%)</span>
                    </td>
                </tr>
            `;
        });

    html += `
                </tbody>
                <tfoot>
                    <tr style="background: #f8fafc; font-weight: bold;">
                        <td colspan="3" style="padding: 12px;">TOPLAM</td>
                        <td style="text-align: right; padding: 12px; color: #3b82f6; font-size: 16px;">${genelToplam.toFixed(1)} m</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;

    // Modal aç
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>📐 Kablo Metraj Raporu</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}
