// ============================================
// PDF RAPOR — jsPDF ile proje raporu oluşturma
// ============================================
import { state } from './state.js';
import { api } from './api.js';

let jsPDFLoaded = false;

async function ensureJsPDF() {
    if (jsPDFLoaded) return;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => { jsPDFLoaded = true; resolve(); };
        script.onerror = () => reject(new Error('jsPDF yüklenemedi'));
        document.head.appendChild(script);
    });
}

export async function pdfRaporOlustur() {
    if (!state.currentProject) {
        alert('Önce bir proje seçin!');
        return;
    }

    try {
        await ensureJsPDF();

        const direkler = await api(`/direkler/proje/${state.currentProject}`);
        const hatlar = await api(`/direkler/proje/${state.currentProject}/hatlar`);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const projeAdi = document.getElementById('currentProjectName').textContent || 'Proje';

        // Başlık
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(`Proje Raporu: ${projeAdi}`, 14, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Oluşturma: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}`, 14, 28);

        // Özet
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Proje Özeti', 14, 40);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        const toplamMesafe = hatlar.reduce((t, h) => t + (h.mesafe_metre || 0), 0);

        doc.text(`Toplam Direk: ${direkler.length}`, 14, 48);
        doc.text(`Toplam Hat: ${hatlar.length}`, 14, 55);
        doc.text(`Toplam Kablo: ${toplamMesafe.toFixed(1)} m (${(toplamMesafe / 1000).toFixed(3)} km)`, 14, 62);

        // Direk Tablosu
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Direk Listesi', 14, 76);

        let y = 84;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('No', 14, y);
        doc.text('Numara', 30, y);
        doc.text('Tip', 70, y);
        doc.text('Cins', 110, y);
        doc.text('Enlem', 145, y);
        doc.text('Boylam', 175, y);

        doc.setDrawColor(200);
        doc.line(14, y + 2, 196, y + 2);

        doc.setFont('helvetica', 'normal');
        y += 7;

        direkler.forEach((d, i) => {
            if (y > 280) {
                doc.addPage();
                y = 20;
            }

            doc.text(`${i + 1}`, 14, y);
            doc.text(d.numara || '-', 30, y);
            doc.text(d.tip_adi || '-', 70, y);
            doc.text(d.cins_adi || '-', 110, y);
            doc.text(`${(d.lat || 0).toFixed(6)}`, 145, y);
            doc.text(`${(d.lng || 0).toFixed(6)}`, 175, y);
            y += 6;
        });

        // Hat Tablosu
        if (hatlar.length > 0) {
            if (y > 240) { doc.addPage(); y = 20; }
            y += 10;

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Hat Listesi', 14, y);
            y += 8;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Başlangıç', 14, y);
            doc.text('Bitiş', 50, y);
            doc.text('İletken', 85, y);
            doc.text('Kesit', 130, y);
            doc.text('Mesafe (m)', 155, y);
            doc.line(14, y + 2, 196, y + 2);

            doc.setFont('helvetica', 'normal');
            y += 7;

            hatlar.forEach(h => {
                if (y > 280) { doc.addPage(); y = 20; }
                doc.text(h.direk1_numara || '-', 14, y);
                doc.text(h.direk2_numara || '-', 50, y);
                doc.text(h.iletken_tipi || '-', 85, y);
                doc.text(`${h.kesit_mm2 || '-'} mm²`, 130, y);
                doc.text(`${(h.mesafe_metre || 0).toFixed(1)}`, 155, y);
                y += 6;
            });
        }

        // Kaydet
        doc.save(`${projeAdi}_rapor.pdf`);

    } catch (err) {
        console.error('PDF oluşturma hatası:', err);
        alert('PDF oluşturulamadı: ' + err.message);
    }
}
