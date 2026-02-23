// ============================================
// DIŞA AKTARMA & RAPORLAR
// ============================================
import { state } from './state.js';
import { api } from './api.js';
import { showNotification } from './ui.js';

export function exportExcel() {
    if (!state.currentProject) {
        alert('Önce bir proje seçin!');
        return;
    }

    api(`/direkler/proje/${state.currentProject}`).then(direkler => {
        let csv = '\uFEFF';
        csv += 'Numara,Tip,Cins,Enlem,Boylam,Aciklama\n';

        direkler.forEach(d => {
            csv += `${d.numara},${d.tip_adi},${d.cins_adi},${d.lat},${d.lng},"${d.aciklama || ''}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `direkler_proje_${state.currentProject}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        showNotification('Excel dosyası indirildi', 'success');
    });
}

export function exportKML() {
    if (!state.currentProject) {
        alert('Önce bir proje seçin!');
        return;
    }

    api(`/direkler/proje/${state.currentProject}`).then(direkler => {
        let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
    <name>Elektrik Direkleri - Proje ${state.currentProject}</name>
    <Style id="direkStyle">
        <IconStyle>
            <Icon>
                <href>http://maps.google.com/mapfiles/kml/shapes/target.png</href>
            </Icon>
        </IconStyle>
    </Style>`;

        direkler.forEach(d => {
            kml += `
    <Placemark>
        <name>${d.numara}</name>
        <description>
            <![CDATA[
                <b>Tip:</b> ${d.tip_adi}<br>
                <b>Cins:</b> ${d.cins_adi}<br>
                <b>Açıklama:</b> ${d.aciklama || '-'}<br>
                <b>Koordinatlar:</b> ${d.lat}, ${d.lng}
            ]]>
        </description>
        <styleUrl>#direkStyle</styleUrl>
        <Point>
            <coordinates>${d.lng},${d.lat},0</coordinates>
        </Point>
    </Placemark>`;
        });

        const sorted = [...direkler].sort((a, b) => a.numara.localeCompare(b.numara));
        if (sorted.length > 1) {
            let coordinates = '';
            sorted.forEach(d => {
                coordinates += `${d.lng},${d.lat},0 `;
            });

            kml += `
    <Placemark>
        <name>Direk Hattı</name>
        <LineString>
            <coordinates>${coordinates.trim()}</coordinates>
        </LineString>
        <Style>
            <LineStyle>
                <color>ff0000ff</color>
                <width>3</width>
            </LineStyle>
        </Style>
    </Placemark>`;
        }

        kml += `
</Document>
</kml>`;

        const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `direkler_proje_${state.currentProject}_${new Date().toISOString().split('T')[0]}.kml`;
        link.click();

        showNotification('KML dosyası indirildi', 'success');
    });
}

export async function malzemeRaporu() {
    if (!state.currentProject) {
        alert('Önce bir proje seçin!');
        return;
    }

    const data = await api(`/direkler/proje/${state.currentProject}/malzemeler`);

    let html = `
        <div class="modal" id="raporModal" style="display: flex;">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>Proje Malzeme Raporu</h2>
                    <button class="close-btn" onclick="document.getElementById('raporModal').remove()">&times;</button>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f1f5f9;">
                            <th style="padding: 10px; text-align: left;">Kod</th>
                            <th style="padding: 10px; text-align: left;">Ad</th>
                            <th style="padding: 10px; text-align: center;">Miktar</th>
                            <th style="padding: 10px; text-align: right;">Birim Fiyat</th>
                            <th style="padding: 10px; text-align: right;">Toplam</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    data.malzemeler.forEach(m => {
        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px;">${m.kod}</td>
                <td style="padding: 10px;">${m.ad}</td>
                <td style="padding: 10px; text-align: center;">${m.toplam_miktar} ${m.birim}</td>
                <td style="padding: 10px; text-align: right;">${m.birim_fiyat ? m.birim_fiyat + ' ' + m.para_birimi : '-'}</td>
                <td style="padding: 10px; text-align: right; font-weight: bold;">${m.maliyet ? m.maliyet.toFixed(2) : '-'}</td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                    <tfoot>
                        <tr style="background: #1e293b; color: white; font-weight: bold;">
                            <td colspan="4" style="padding: 15px; text-align: right;">TOPLAM MALİYET:</td>
                            <td style="padding: 15px; text-align: right;">${data.toplam_maliyet.toFixed(2)} TRY</td>
                        </tr>
                    </tfoot>
                </table>
                <button class="btn btn-primary" onclick="window.print()" style="margin-top: 20px;">📄 PDF İndir</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
}
