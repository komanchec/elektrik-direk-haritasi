<template>
  <div class="direk-detail" v-if="direk">

    <div class="detail-row">
      <span>Numara</span>
      <strong>{{ direk.numara }}</strong>
    </div>
    <div class="detail-row">
      <span>Tip</span>
      <strong>{{ direk.tip_adi }}</strong>
    </div>
    <div class="detail-row">
      <span>Cins</span>
      <strong>{{ direk.cins_adi }}</strong>
    </div>
    <div class="detail-row">
      <span>Durum</span>
      <span :class="['badge', direk.durum?.toLowerCase()]">{{ direk.durum }}</span>
    </div>
    <div class="detail-row">
      <span>Konum</span>
      <span class="coords">{{ direk.lat?.toFixed(6) }}, {{ direk.lng?.toFixed(6) }}</span>
    </div>

    <div class="detail-actions">
      <button class="btn" @click="editMode = !editMode">✏ Düzenle</button>
      <button class="btn danger" @click="handleDelete">🗑 Sil</button>
    </div>

    <div v-if="editMode" class="edit-section">
      <div class="form-group">
        <label>Açıklama</label>
        <textarea v-model="aciklama" rows="3" @change="saveAciklama"></textarea>
      </div>
    </div>

    <!-- Malzeme listesi -->
    <div class="malzeme-section">
      <div class="detail-row">
        <strong>Malzemeler ({{ malzemeler.length }})</strong>
        <button class="btn" style="font-size:0.73rem; padding:0.15rem 0.4rem" @click="$emit('malzemeEkle', direk)">+ Ekle</button>
      </div>
      <div v-for="m in malzemeler" :key="m.id" class="malzeme-row">
        <span>{{ m.malzeme_tipi_adi }}</span>
        <span>{{ m.miktar }} {{ m.birim }}</span>
        <button class="btn danger" style="font-size:0.7rem;padding:0.1rem 0.35rem" @click="deleteMalzeme(m.id)">✕</button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useProjectStore } from '../../stores/projectStore'
import { useApi }          from '../../composables/useApi'

defineEmits(['malzemeEkle'])

const projStore = useProjectStore()
const { get, put, del } = useApi()

const direk     = computed(() => projStore.selectedDirek)
const editMode  = ref(false)
const aciklama  = ref('')
const malzemeler = ref([])

watch(direk, async (d) => {
  if (!d) return
  aciklama.value = d.aciklama || ''
  editMode.value = false
  await loadMalzemeler(d.id)
}, { immediate: true })

async function loadMalzemeler(id) {
  try {
    malzemeler.value = await get(`/api/direkler/${id}/malzemeler`)
  } catch { malzemeler.value = [] }
}

async function saveAciklama() {
  if (!direk.value) return
  try {
    await put(`/api/direkler/${direk.value.id}/aciklama`, { aciklama: aciklama.value })
  } catch (err) {
    console.error(err)
  }
}

async function handleDelete() {
  if (!direk.value) return
  if (!confirm(`${direk.value.numara} silinsin mi?`)) return
  await del(`/api/direkler/${direk.value.id}`)
  projStore.selectDirek(null)
}

async function deleteMalzeme(id) {
  await del(`/api/direkler/${direk.value.id}/malzemeler/${id}`)
  await loadMalzemeler(direk.value.id)
}
</script>

<style scoped>
.direk-detail { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.82rem; }

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.15rem 0;
}

.detail-row span:first-child { color: var(--text-muted); flex-shrink: 0; }

.badge {
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-size: 0.73rem;
  font-weight: 600;
}
.badge.mevcut { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
.badge.yeni   { background: color-mix(in srgb, var(--info)    20%, transparent); color: var(--info);    }
.badge.söküm  { background: color-mix(in srgb, var(--danger)  20%, transparent); color: var(--danger);  }

.coords { font-family: monospace; font-size: 0.75rem; color: var(--text-muted); }

.detail-actions { display: flex; gap: 0.4rem; margin-top: 0.25rem; }
.detail-actions .btn { flex: 1; justify-content: center; font-size: 0.78rem; }

.edit-section { border-top: 1px solid var(--border-color); padding-top: 0.5rem; margin-top: 0.25rem; }

.malzeme-section { border-top: 1px solid var(--border-color); padding-top: 0.5rem; margin-top: 0.25rem; display: flex; flex-direction: column; gap: 0.3rem; }
.malzeme-row     { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; }
.malzeme-row span:first-child { flex: 1; color: var(--text-secondary); }
.malzeme-row span:nth-child(2) { color: var(--text-muted); }

textarea { resize: vertical; min-height: 60px; }
</style>
