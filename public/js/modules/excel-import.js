// ============================================
// EXCEL ŞABLON IMPORT
// Önceden tanımlı şablonla toplu veri girişi
// ============================================
import { state } from './state.js';
import { api } from './api.js';
import { showNotification } from './ui.js';

export function excelImportModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 550px; font-family: 'Segoe UI', sans-serif;">
            <div class="modal-header">
                <h2>📊 Excel Şablon Import</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <div style="padding: 10px 0;">
                <div style="background: #f0f9ff; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="margin: 0; font-size: 12px; color: #0369a1;">
                        <b>📋 Şablon Format:</b> Excel dosyası aşağıdaki sütunları içermelidir:<br><br>
                        <code style="background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">numara | lat | lng | tip_id | cins_id | aciklama</code>
                    </p>
                </div>

                <button onclick="window._downloadExcelTemplate()" 
                    style="width: 100%; padding: 10px; background: #059669; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; margin-bottom: 15px;">
                    📥 Şablon İndir (CSV)
                </button>

                <div style="border: 2px dashed #cbd5e1; padding: 25px; text-align: center; border-radius: 10px; cursor: pointer;" 
                     id="excelDropZone">
                    <div style="font-size: 24px; margin-bottom: 8px;">📁</div>
                    <div style="font-size: 13px; color: #64748b;">CSV dosyasını buraya sürükleyin</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 5px;">veya tıklayarak seçin</div>
                    <input type="file" accept=".csv,.txt" id="excelFileInput" style="display: none;">
                </div>

                <div id="excelPreview" style="display: none; margin-top: 15px;"></div>

                <button id="excelImportBtn" onclick="window._executeExcelImport()" 
                    style="display: none; width: 100%; margin-top: 12px; padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px;">
                    ⬆️ İçe Aktar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // File input
    const dropZone = document.getElementById('excelDropZone');
    const fileInput = document.getElementById('excelFileInput');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = '#3b82f6'; });
    dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = '#cbd5e1'; });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#cbd5e1';
        if (e.dataTransfer.files[0]) parseCSV(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) parseCSV(fileInput.files[0]);
    });
}

let parsedRows = [];

function parseCSV(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase());

        parsedRows = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(/[,;\t]/).map(c => c.trim());
            const row = {};
            headers.forEach((h, idx) => { row[h] = cols[idx] || ''; });
            if (row.lat && row.lng) parsedRows.push(row);
        }

        // Preview
        const preview = document.getElementById('excelPreview');
        let html = `<div style="font-size: 12px; font-weight: 600; margin-bottom: 5px;">${parsedRows.length} satır bulundu</div>`;
        html += '<table style="width: 100%; border-collapse: collapse; font-size: 11px;">';
        html += '<thead><tr style="background: #f1f5f9;">';
        headers.forEach(h => { html += `<th style="padding: 5px; text-align: left;">${h}</th>`; });
        html += '</tr></thead><tbody>';

        parsedRows.slice(0, 5).forEach(row => {
            html += '<tr>';
            headers.forEach(h => { html += `<td style="padding: 4px; border-top: 1px solid #e2e8f0;">${row[h] || '-'}</td>`; });
            html += '</tr>';
        });

        if (parsedRows.length > 5) html += `<tr><td colspan="${headers.length}" style="padding: 5px; color: #94a3b8; text-align: center;">... ve ${parsedRows.length - 5} satır daha</td></tr>`;
        html += '</tbody></table>';

        preview.innerHTML = html;
        preview.style.display = 'block';
        document.getElementById('excelImportBtn').style.display = 'block';
    };
    reader.readAsText(file, 'UTF-8');
}

export async function executeExcelImport() {
    if (!state.currentProject) return alert('Önce proje seçin!');
    if (parsedRows.length === 0) return alert('Veri yok!');

    let basarili = 0, hatali = 0;
    for (const row of parsedRows) {
        try {
            await api('/direkler', {
                method: 'POST',
                body: JSON.stringify({
                    proje_id: state.currentProject,
                    numara: row.numara || '',
                    lat: parseFloat(row.lat),
                    lng: parseFloat(row.lng),
                    tip_id: parseInt(row.tip_id) || 1,
                    cins_id: parseInt(row.cins_id) || 1,
                    aciklama: row.aciklama || ''
                })
            });
            basarili++;
        } catch (e) {
            hatali++;
        }
    }

    showNotification(`✅ ${basarili} direk eklendi${hatali ? `, ${hatali} hatalı` : ''}`, basarili > 0 ? 'success' : 'error');

    // Modal kapat ve sayfayı yenile
    document.querySelector('.modal')?.remove();
    location.reload();
}

export function downloadExcelTemplate() {
    const csv = 'numara,lat,lng,tip_id,cins_id,aciklama\nD-001,39.925,32.836,1,1,Örnek direk\nD-002,39.926,32.837,2,1,\n';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'direk_sablon.csv';
    a.click();
    URL.revokeObjectURL(url);
}
