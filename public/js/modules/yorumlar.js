// ============================================
// YORUM SİSTEMİ (Direk/Hat üzerine not bırakma)
// ============================================
import { state } from './state.js';
import { api } from './api.js';
import { showNotification } from './ui.js';

export async function yorumlariGoster(entityType, entityId) {
    const yorumlar = await api(`/yorumlar/${entityType}/${entityId}`);

    let html = `
        <div style="font-family: 'Segoe UI', sans-serif;">
            <div style="margin-bottom: 15px;">
                <textarea id="yeniYorum" placeholder="Yorum yazın..." 
                    style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; min-height: 60px; resize: vertical; font-size: 13px;"></textarea>
                <button onclick="window._yorumEkle('${entityType}', ${entityId})" 
                    style="margin-top: 8px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                    💬 Yorum Ekle
                </button>
            </div>
            <div id="yorumListesi">
    `;

    if (yorumlar.length === 0) {
        html += '<div style="color: #94a3b8; text-align: center; padding: 20px;">Henüz yorum yok</div>';
    }

    yorumlar.forEach(y => {
        const tarih = new Date(y.created_at).toLocaleString('tr-TR');
        html += `
            <div style="padding: 10px; border-left: 3px solid #3b82f6; margin-bottom: 10px; background: #f8fafc; border-radius: 0 8px 8px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-weight: 600; font-size: 12px; color: #3b82f6;">👤 ${y.username}</span>
                    <span style="font-size: 11px; color: #94a3b8;">${tarih}</span>
                </div>
                <div style="font-size: 13px; color: #334155;">${y.yorum}</div>
            </div>
        `;
    });

    html += '</div></div>';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.id = 'yorumModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header">
                <h2>💬 Yorumlar</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            ${html}
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

export async function yorumEkle(entityType, entityId) {
    const textarea = document.getElementById('yeniYorum');
    const yorum = textarea?.value?.trim();
    if (!yorum) return alert('Yorum boş olamaz!');

    await api('/yorumlar', {
        method: 'POST',
        body: JSON.stringify({
            proje_id: state.currentProject,
            entity_type: entityType,
            entity_id: entityId,
            yorum
        })
    });

    showNotification('Yorum eklendi', 'success');
    const modal = document.getElementById('yorumModal');
    if (modal) modal.remove();

    // Tekrar aç
    yorumlariGoster(entityType, entityId);
}
