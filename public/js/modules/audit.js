// ============================================
// İŞLEM GEÇMİŞİ (Audit Log Panel)
// ============================================
import { state } from './state.js';
import { api } from './api.js';

export async function islemGecmisiGoster() {
    if (!state.currentProject) {
        alert('Önce bir proje seçin!');
        return;
    }

    const islemler = await api(`/audit/proje/${state.currentProject}`);

    const islemIcons = {
        'direk_ekle': '📍',
        'direk_sil': '🗑️',
        'direk_guncelle': '✏️',
        'hat_ekle': '🔗',
        'hat_sil': '✂️',
        'yorum_ekle': '💬',
        'proje_olustur': '📁',
        'foto_yukle': '📷'
    };

    let html = `
        <div style="font-family: 'Segoe UI', sans-serif;">
            <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; padding: 15px; border-radius: 10px; margin-bottom: 15px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold;">${islemler.length}</div>
                <div style="font-size: 12px; opacity: 0.8;">Kayıtlı İşlem</div>
            </div>
            <div style="max-height: 400px; overflow-y: auto;">
    `;

    if (islemler.length === 0) {
        html += '<div style="text-align: center; color: #94a3b8; padding: 30px;">Henüz işlem kaydı yok</div>';
    }

    islemler.forEach(i => {
        const tarih = new Date(i.created_at).toLocaleString('tr-TR');
        const icon = islemIcons[i.islem] || '📋';
        const entityLabel = i.entity_type ? ` [${i.entity_type} #${i.entity_id}]` : '';

        html += `
            <div style="display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                <span style="font-size: 18px; flex-shrink: 0;">${icon}</span>
                <div style="flex: 1;">
                    <div style="font-size: 13px; color: #1e293b;">
                        <b>${i.username}</b> — ${i.islem.replace(/_/g, ' ')}${entityLabel}
                    </div>
                    ${i.detay ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${i.detay}</div>` : ''}
                    <div style="font-size: 10px; color: #94a3b8; margin-top: 3px;">${tarih}</div>
                </div>
            </div>
        `;
    });

    html += '</div></div>';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>📋 İşlem Geçmişi</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            ${html}
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}
