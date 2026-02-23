// ============================================
// DXF EXPORT — Projeyi DXF formatında indir
// ============================================
import { state } from './state.js';
import { api } from './api.js';
import { showNotification } from './ui.js';

export async function dxfExport() {
    if (!state.currentProject) {
        alert('Önce bir proje seçin!');
        return;
    }

    showNotification('DXF oluşturuluyor...', 'info');

    const direkler = await api(`/direkler/proje/${state.currentProject}`);
    const hatlar = await api(`/direkler/proje/${state.currentProject}/hatlar`);
    const projeAdi = document.getElementById('currentProjectName').textContent || 'Proje';

    // DXF içerik oluştur
    let dxf = '';

    // Header
    dxf += '0\nSECTION\n2\nHEADER\n0\nENDSEC\n';

    // Tables
    dxf += '0\nSECTION\n2\nTABLES\n';
    dxf += '0\nTABLE\n2\nLAYER\n';
    // Direkler layer
    dxf += '0\nLAYER\n2\nDIREKLER\n70\n0\n62\n3\n6\nCONTINUOUS\n';
    // Hatlar layer
    dxf += '0\nLAYER\n2\nHATLAR\n70\n0\n62\n1\n6\nCONTINUOUS\n';
    // Etiketler layer
    dxf += '0\nLAYER\n2\nETIKETLER\n70\n0\n62\n7\n6\nCONTINUOUS\n';
    dxf += '0\nENDTAB\n0\nENDSEC\n';

    // Entities
    dxf += '0\nSECTION\n2\nENTITIES\n';

    // Direk noktaları (CIRCLE) ve etiketleri (TEXT)
    direkler.forEach(d => {
        // Daire
        dxf += `0\nCIRCLE\n8\nDIREKLER\n10\n${d.lng}\n20\n${d.lat}\n30\n0\n40\n0.00005\n`;
        // Numara etiketi
        dxf += `0\nTEXT\n8\nETIKETLER\n10\n${d.lng + 0.00008}\n20\n${d.lat + 0.00008}\n30\n0\n40\n0.00008\n1\n${d.numara}\n`;
        // Tip etiketi
        dxf += `0\nTEXT\n8\nETIKETLER\n10\n${d.lng + 0.00008}\n20\n${d.lat - 0.00005}\n30\n0\n40\n0.00005\n1\n${d.tip_adi || ''}\n`;
    });

    // Hat çizgileri (LINE) ve etiketleri
    hatlar.forEach(h => {
        // Çizgi
        dxf += `0\nLINE\n8\nHATLAR\n10\n${h.direk1_lng}\n20\n${h.direk1_lat}\n30\n0\n11\n${h.direk2_lng}\n21\n${h.direk2_lat}\n31\n0\n`;
        // Mesafe etiketi
        const midX = (h.direk1_lng + h.direk2_lng) / 2;
        const midY = (h.direk1_lat + h.direk2_lat) / 2;
        const mesafe = h.mesafe_metre || 0;
        dxf += `0\nTEXT\n8\nETIKETLER\n10\n${midX}\n20\n${midY + 0.00005}\n30\n0\n40\n0.00005\n1\n${mesafe.toFixed(1)}m\n`;
        if (h.iletken_tipi) {
            dxf += `0\nTEXT\n8\nETIKETLER\n10\n${midX}\n20\n${midY - 0.00005}\n30\n0\n40\n0.00004\n1\n${h.iletken_tipi}\n`;
        }
    });

    dxf += '0\nENDSEC\n0\nEOF\n';

    // Download
    const blob = new Blob([dxf], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projeAdi}.dxf`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('DXF dosyası indirildi', 'success');
}
