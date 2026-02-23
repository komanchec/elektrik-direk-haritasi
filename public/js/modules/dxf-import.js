// ============================================
// DXF IMPORT — AutoCAD dosyasından direk/hat aktarma
// ============================================
import { state } from './state.js';
import { api } from './api.js';
import { showNotification } from './ui.js';

export function dxfImportModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; font-family: 'Segoe UI', sans-serif;">
            <div class="modal-header">
                <h2>📐 DXF Import</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding: 10px 0;">
                <div style="background: #fefce8; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="margin: 0; font-size: 12px; color: #854d0e;">
                        <b>ℹ️ DXF Import Kuralları:</b><br>
                        • CIRCLE → Direk noktası (merkez koordinat)<br>
                        • LINE → Hat çizgisi (iki uç nokta)<br>
                        • TEXT → Etiket (numara ataması)<br>
                        Koordinatlar <b>WGS84 (lat/lng)</b> olmalıdır.
                    </p>
                </div>

                <div style="border: 2px dashed #cbd5e1; padding: 30px; text-align: center; border-radius: 10px; cursor: pointer;" id="dxfDropZone">
                    <div style="font-size: 30px; margin-bottom: 8px;">📐</div>
                    <div style="font-size: 13px; color: #64748b;">DXF dosyasını sürükleyin veya tıklayın</div>
                    <input type="file" accept=".dxf" id="dxfFileInput" style="display: none;">
                </div>

                <div id="dxfPreview" style="display: none; margin-top: 15px;"></div>
                <button id="dxfImportBtn" onclick="window._executeDxfImport()" 
                    style="display: none; width: 100%; margin-top: 12px; padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px;">
                    ⬆️ İçe Aktar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    const dropZone = document.getElementById('dxfDropZone');
    const fileInput = document.getElementById('dxfFileInput');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = '#3b82f6'; });
    dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = '#cbd5e1'; });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files[0]) parseDXF(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) parseDXF(fileInput.files[0]);
    });
}

let parsedEntities = { circles: [], lines: [], texts: [] };

function parseDXF(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        parsedEntities = { circles: [], lines: [], texts: [] };

        const lines = content.split('\n').map(l => l.trim());

        for (let i = 0; i < lines.length; i++) {
            // CIRCLE
            if (lines[i] === 'CIRCLE') {
                const circle = {};
                for (let j = i + 1; j < Math.min(i + 20, lines.length); j += 2) {
                    if (lines[j] === '10') circle.x = parseFloat(lines[j + 1]);
                    if (lines[j] === '20') circle.y = parseFloat(lines[j + 1]);
                    if (lines[j] === '40') circle.r = parseFloat(lines[j + 1]);
                    if (lines[j] === '0') break;
                }
                if (circle.x !== undefined && circle.y !== undefined) {
                    parsedEntities.circles.push(circle);
                }
            }

            // LINE
            if (lines[i] === 'LINE') {
                const line = {};
                for (let j = i + 1; j < Math.min(i + 30, lines.length); j += 2) {
                    if (lines[j] === '10') line.x1 = parseFloat(lines[j + 1]);
                    if (lines[j] === '20') line.y1 = parseFloat(lines[j + 1]);
                    if (lines[j] === '11') line.x2 = parseFloat(lines[j + 1]);
                    if (lines[j] === '21') line.y2 = parseFloat(lines[j + 1]);
                    if (lines[j] === '0') break;
                }
                if (line.x1 !== undefined && line.y1 !== undefined) {
                    parsedEntities.lines.push(line);
                }
            }

            // TEXT
            if (lines[i] === 'TEXT') {
                const text = {};
                for (let j = i + 1; j < Math.min(i + 20, lines.length); j += 2) {
                    if (lines[j] === '10') text.x = parseFloat(lines[j + 1]);
                    if (lines[j] === '20') text.y = parseFloat(lines[j + 1]);
                    if (lines[j] === '1') text.value = lines[j + 1];
                    if (lines[j] === '0') break;
                }
                if (text.value) parsedEntities.texts.push(text);
            }
        }

        // Preview
        const preview = document.getElementById('dxfPreview');
        preview.innerHTML = `
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; text-align: center;">
                    <div>
                        <div style="font-size: 22px; font-weight: bold; color: #16a34a;">${parsedEntities.circles.length}</div>
                        <div style="font-size: 11px; color: #64748b;">Direk (Circle)</div>
                    </div>
                    <div>
                        <div style="font-size: 22px; font-weight: bold; color: #dc2626;">${parsedEntities.lines.length}</div>
                        <div style="font-size: 11px; color: #64748b;">Hat (Line)</div>
                    </div>
                    <div>
                        <div style="font-size: 22px; font-weight: bold; color: #6366f1;">${parsedEntities.texts.length}</div>
                        <div style="font-size: 11px; color: #64748b;">Etiket (Text)</div>
                    </div>
                </div>
            </div>
        `;
        preview.style.display = 'block';
        document.getElementById('dxfImportBtn').style.display = 'block';
    };
    reader.readAsText(file);
}

export async function executeDxfImport() {
    if (!state.currentProject) return alert('Önce proje seçin!');

    const { circles, texts } = parsedEntities;
    let basarili = 0;

    // Etiketleri en yakın circle ile eşleştir
    for (const circle of circles) {
        let numara = `DXF-${basarili + 1}`;

        // En yakın TEXT bul
        let minDist = Infinity;
        texts.forEach(t => {
            const dist = Math.sqrt((t.x - circle.x) ** 2 + (t.y - circle.y) ** 2);
            if (dist < minDist && dist < 0.001) { // ~100m yakınlık
                minDist = dist;
                numara = t.value;
            }
        });

        try {
            await api('/direkler', {
                method: 'POST',
                body: JSON.stringify({
                    proje_id: state.currentProject,
                    numara,
                    lat: circle.y,  // DXF Y = lat
                    lng: circle.x,  // DXF X = lng
                    tip_id: 1,
                    cins_id: 1,
                    aciklama: 'DXF Import'
                })
            });
            basarili++;
        } catch (e) { /* skip duplicates */ }
    }

    showNotification(`✅ DXF Import: ${basarili} direk eklendi`, 'success');
    document.querySelector('.modal')?.remove();
    location.reload();
}
