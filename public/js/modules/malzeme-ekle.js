// ============================================
// MALZEME EKLEME PENCERESİ
// Cinsleri → Tipleri hiyerarşik seçim
// ============================================
import { state } from './state.js';
import { api } from './api.js';
import { showNotification } from './ui.js';

let selectedCinsId = null;
let selectedTipId = null;

// ---- Modal Açma / Kapama ----

export function malzemeEklePenceresiAc() {
    if (!state.selectedDirek) {
        showNotification('Önce bir direk seçin!', 'error');
        return;
    }

    const modal = document.getElementById('malzemeEkleModal');
    if (modal) {
        modal.style.display = 'flex';
        selectedCinsId = null;
        selectedTipId = null;
        document.getElementById('malzemeTipListesi').innerHTML = '<div class="mep-placeholder">← Sol taraftan malzeme cinsi seçin</div>';
        document.getElementById('mepMiktar').value = '1';
        document.getElementById('mepDurum').value = 'M+M';
        loadMalzemeCinsleri();
        loadDirekMalzemeleriTablosu();
    }
}

export function malzemeEklePenceresiKapat() {
    const modal = document.getElementById('malzemeEkleModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ---- Malzeme Cinsleri Yükleme ----

async function loadMalzemeCinsleri() {
    try {
        const cinsler = await api('/malzemeler/cinsler');
        const list = document.getElementById('malzemeCinsListesi');
        list.innerHTML = '';

        cinsler.forEach(c => {
            const item = document.createElement('div');
            item.className = 'mep-list-item';
            item.textContent = c.ad;
            item.dataset.id = c.id;
            item.addEventListener('click', () => {
                document.querySelectorAll('#malzemeCinsListesi .mep-list-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                selectedCinsId = c.id;
                selectedTipId = null;
                loadMalzemeTipleri(c.id);
            });
            list.appendChild(item);
        });
    } catch (err) {
        console.error('Malzeme cinsleri yükleme hatası:', err);
    }
}

// ---- Malzeme Tipleri Yükleme ----

async function loadMalzemeTipleri(cinsId) {
    try {
        const tipler = await api(`/malzemeler/tipler/${cinsId}`);
        const list = document.getElementById('malzemeTipListesi');
        list.innerHTML = '';

        if (tipler.length === 0) {
            list.innerHTML = '<div class="mep-placeholder">Bu cinste henüz tip tanımlı değil</div>';
            return;
        }

        tipler.forEach(t => {
            const item = document.createElement('div');
            item.className = 'mep-list-item';
            item.textContent = t.ad;
            item.dataset.id = t.id;
            item.addEventListener('click', () => {
                document.querySelectorAll('#malzemeTipListesi .mep-list-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                selectedTipId = t.id;
                // Birim bilgisini güncelle
                document.getElementById('mepBirim').textContent = t.birim || 'adet';
            });
            list.appendChild(item);
        });
    } catch (err) {
        console.error('Malzeme tipleri yükleme hatası:', err);
    }
}

// ---- Direğe Malzeme Ekle ----

export async function malzemeTipEkle() {
    if (!state.selectedDirek) {
        showNotification('Önce bir direk seçin!', 'error');
        return;
    }

    if (!selectedTipId) {
        showNotification('Malzeme tipleri listesinden bir tip seçin!', 'error');
        return;
    }

    const miktar = parseFloat(document.getElementById('mepMiktar').value);
    const durum = document.getElementById('mepDurum').value;

    if (!miktar || miktar <= 0) {
        showNotification('Geçerli bir miktar girin!', 'error');
        return;
    }

    try {
        const res = await api(`/direkler/${state.selectedDirek.id}/malzemeler`, {
            method: 'POST',
            body: JSON.stringify({ malzeme_tip_id: selectedTipId, miktar, durum })
        });

        if (res.error) {
            showNotification('Hata: ' + res.error, 'error');
            return;
        }

        showNotification('Malzeme eklendi', 'success');
        loadDirekMalzemeleriTablosu();

        // Sidebar'daki malzeme listesini de güncelle
        if (window._loadDirekMalzemeler) {
            window._loadDirekMalzemeler(state.selectedDirek.id);
        }
    } catch (err) {
        console.error('Malzeme ekleme hatası:', err);
        showNotification('Malzeme eklenirken hata oluştu', 'error');
    }
}

// ---- Direk Malzemeleri Tablosu ----

async function loadDirekMalzemeleriTablosu() {
    if (!state.selectedDirek) return;

    try {
        const malzemeler = await api(`/direkler/${state.selectedDirek.id}/malzemeler`);
        const tbody = document.getElementById('mepMalzemeTablosu');
        tbody.innerHTML = '';

        if (malzemeler.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">Henüz malzeme eklenmemiş</td></tr>';
            return;
        }

        malzemeler.forEach(m => {
            const topMiktar = m.miktar;
            const topTl = (m.birim_fiyat || 0) * m.miktar;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${m.malzeme_cinsi_adi}</td>
                <td>${m.malzeme_tipi_adi}</td>
                <td>${m.durum || 'M+M'}</td>
                <td>${m.miktar}</td>
                <td>${m.birim}</td>
                <td>${topTl.toFixed(2)}</td>
                <td>
                    <button class="mep-btn-remove" data-malzeme-id="${m.id}" title="Sil">✕</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Silme butonları
        tbody.querySelectorAll('.mep-btn-remove').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const malzemeId = e.target.dataset.malzemeId;
                await malzemeSilFromModal(malzemeId);
            });
        });
    } catch (err) {
        console.error('Direk malzemeleri yükleme hatası:', err);
    }
}

// ---- Malzeme Sil ----

async function malzemeSilFromModal(malzemeId) {
    if (!state.selectedDirek) return;

    try {
        await api(`/direkler/${state.selectedDirek.id}/malzemeler/${malzemeId}`, { method: 'DELETE' });
        showNotification('Malzeme silindi', 'success');
        loadDirekMalzemeleriTablosu();

        if (window._loadDirekMalzemeler) {
            window._loadDirekMalzemeler(state.selectedDirek.id);
        }
    } catch (err) {
        console.error('Malzeme silme hatası:', err);
    }
}

// ---- Modal HTML Oluştur ----

export function createMalzemeEkleModal() {
    const modal = document.createElement('div');
    modal.id = 'malzemeEkleModal';
    modal.className = 'mep-modal-overlay';
    modal.style.display = 'none';

    modal.innerHTML = `
        <div class="mep-modal">
            <div class="mep-header">
                <h2>📦 Malzeme Ekle</h2>
                <button class="mep-close" id="mepCloseBtn">✕</button>
            </div>
            <div class="mep-body">
                <div class="mep-left">
                    <div class="mep-panel">
                        <div class="mep-panel-header">MALZEME CİNSLERİ</div>
                        <div class="mep-list" id="malzemeCinsListesi"></div>
                    </div>
                </div>
                <div class="mep-center">
                    <div class="mep-panel">
                        <div class="mep-panel-header">MALZEME TİPLERİ</div>
                        <div class="mep-list" id="malzemeTipListesi">
                            <div class="mep-placeholder">← Sol taraftan malzeme cinsi seçin</div>
                        </div>
                    </div>
                </div>
                <div class="mep-right">
                    <div class="mep-controls">
                        <div class="mep-control-group">
                            <label>DURUM</label>
                            <select id="mepDurum" class="mep-input">
                                <option value="M+M">M+M</option>
                                <option value="M">M</option>
                                <option value="DM">DM</option>
                                <option value="DM+M">DM+M</option>
                                <option value="ENH">ENH</option>
                                <option value="KM">KM</option>
                                <option value="ME">ME</option>
                                <option value="MEVCUT">MEVCUT</option>
                            </select>
                        </div>
                        <div class="mep-control-group">
                            <label>MİKTAR</label>
                            <div class="mep-miktar-row">
                                <input type="number" id="mepMiktar" class="mep-input" value="1" min="0.01" step="0.01">
                                <span id="mepBirim" class="mep-birim-label">adet</span>
                            </div>
                        </div>
                        <button class="mep-btn-add" id="mepEkleBtn">
                            <span class="mep-btn-icon">＋</span> Ekle
                        </button>
                        <button class="mep-btn-remove-selected" id="mepSilBtn">
                            <span class="mep-btn-icon">−</span> Seçili Sil
                        </button>
                    </div>
                </div>
            </div>
            <div class="mep-footer">
                <div class="mep-table-container">
                    <table class="mep-table">
                        <thead>
                            <tr>
                                <th>CİNS</th>
                                <th>TİP</th>
                                <th>DURUM</th>
                                <th>MİKTAR</th>
                                <th>BİRİM</th>
                                <th>TOP. TL.</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="mepMalzemeTablosu">
                            <tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">Henüz malzeme eklenmemiş</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    document.getElementById('mepCloseBtn').addEventListener('click', malzemeEklePenceresiKapat);
    document.getElementById('mepEkleBtn').addEventListener('click', malzemeTipEkle);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) malzemeEklePenceresiKapat();
    });

    // ESC ile kapat
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            malzemeEklePenceresiKapat();
        }
    });
}
