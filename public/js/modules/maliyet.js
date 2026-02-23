// ============================================
// MALİYET RAPORU
// Malzeme birim fiyat × miktar
// ============================================
import { state } from './state.js';
import { api } from './api.js';

export async function maliyetRaporu() {
    if (!state.currentProject) {
        alert('Önce bir proje seçin!');
        return;
    }

    const direkler = await api(`/direkler/proje/${state.currentProject}`);
    const hatlar = await api(`/direkler/proje/${state.currentProject}/hatlar`);

    // Direk tip sayıları
    const tipSayilari = {};
    direkler.forEach(d => {
        const key = `${d.tip_adi} (${d.cins_adi})`;
        tipSayilari[key] = (tipSayilari[key] || 0) + 1;
    });

    // Hat iletken gruplama
    const iletkenGruplari = {};
    hatlar.forEach(h => {
        const key = `${h.iletken_tipi || 'Bilinmiyor'} ${h.kesit_mm2 || '-'}mm²`;
        if (!iletkenGruplari[key]) iletkenGruplari[key] = { toplam: 0, adet: 0 };
        iletkenGruplari[key].toplam += (h.mesafe_metre || 0);
        iletkenGruplari[key].adet++;
    });

    let html = `
        <div style="font-family: 'Segoe UI', sans-serif;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 10px; margin-bottom: 15px; text-align: center;">
                <div style="font-size: 14px; opacity: 0.8;">Proje Maliyet Özeti</div>
                <div style="font-size: 12px; margin-top: 5px;">Birim fiyatları düzenlemek için tablodaki alanlara tıklayın</div>
            </div>

            <h4 style="margin: 10px 0 5px; font-size: 13px;">📍 Direk Maliyeti</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;" id="direkMaliyetTable">
                <thead><tr style="background: #f1f5f9;">
                    <th style="padding: 8px; text-align: left;">Tip</th>
                    <th style="padding: 8px; text-align: center;">Adet</th>
                    <th style="padding: 8px; text-align: right;">Birim (₺)</th>
                    <th style="padding: 8px; text-align: right;">Toplam (₺)</th>
                </tr></thead><tbody>`;

    Object.entries(tipSayilari).forEach(([tip, adet]) => {
        html += `<tr>
            <td style="padding: 6px 8px; border-top: 1px solid #e2e8f0;">${tip}</td>
            <td style="padding: 6px 8px; border-top: 1px solid #e2e8f0; text-align: center;">${adet}</td>
            <td style="padding: 6px 8px; border-top: 1px solid #e2e8f0; text-align: right;">
                <input type="number" class="maliyet-input" value="0" data-adet="${adet}" style="width: 80px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: right;">
            </td>
            <td style="padding: 6px 8px; border-top: 1px solid #e2e8f0; text-align: right; font-weight: 600;" class="maliyet-toplam">0 ₺</td>
        </tr>`;
    });

    html += `</tbody></table>

            <h4 style="margin: 15px 0 5px; font-size: 13px;">🔗 Kablo Maliyeti</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;" id="kabloMaliyetTable">
                <thead><tr style="background: #f1f5f9;">
                    <th style="padding: 8px; text-align: left;">İletken</th>
                    <th style="padding: 8px; text-align: center;">Metre</th>
                    <th style="padding: 8px; text-align: right;">₺/m</th>
                    <th style="padding: 8px; text-align: right;">Toplam (₺)</th>
                </tr></thead><tbody>`;

    Object.entries(iletkenGruplari).forEach(([iletken, data]) => {
        html += `<tr>
            <td style="padding: 6px 8px; border-top: 1px solid #e2e8f0;">${iletken}</td>
            <td style="padding: 6px 8px; border-top: 1px solid #e2e8f0; text-align: center;">${data.toplam.toFixed(0)}</td>
            <td style="padding: 6px 8px; border-top: 1px solid #e2e8f0; text-align: right;">
                <input type="number" class="maliyet-input" value="0" data-adet="${data.toplam.toFixed(0)}" style="width: 80px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: right;">
            </td>
            <td style="padding: 6px 8px; border-top: 1px solid #e2e8f0; text-align: right; font-weight: 600;" class="maliyet-toplam">0 ₺</td>
        </tr>`;
    });

    html += `</tbody></table>

            <div style="margin-top: 15px; padding: 15px; background: #f0fdf4; border-radius: 8px; text-align: center;">
                <div style="font-size: 12px; color: #059669;">GENEL TOPLAM</div>
                <div style="font-size: 24px; font-weight: bold; color: #059669;" id="genelToplam">0 ₺</div>
            </div>
        </div>
    `;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 550px;">
            <div class="modal-header">
                <h2>💰 Maliyet Raporu</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            ${html}
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Birim fiyat değişiminde otomatik hesapla
    modal.querySelectorAll('.maliyet-input').forEach(inp => {
        inp.addEventListener('input', () => {
            const adet = parseFloat(inp.dataset.adet);
            const birim = parseFloat(inp.value) || 0;
            const toplam = adet * birim;
            inp.closest('tr').querySelector('.maliyet-toplam').textContent =
                toplam.toLocaleString('tr-TR') + ' ₺';

            // Genel toplam
            let genel = 0;
            modal.querySelectorAll('.maliyet-toplam').forEach(td => {
                const val = parseFloat(td.textContent.replace(/[^\d]/g, '')) || 0;
                genel += val;
            });
            document.getElementById('genelToplam').textContent = genel.toLocaleString('tr-TR') + ' ₺';
        });
    });
}
