<template>
  <div class="admin-section">
    <h2>Direk Cinsleri & Tipleri</h2>

    <div class="two-col">

      <!-- Cinsler -->
      <div class="col-card">
        <div class="col-header">
          <h3>Cinsler</h3>
          <button class="btn primary" @click="showCinsForm = !showCinsForm">+ Ekle</button>
        </div>

        <form v-if="showCinsForm" class="inline-form" @submit.prevent="addCins">
          <input v-model="newCins.ad" placeholder="Cins adı" required />
          <input v-model="newCins.aciklama" placeholder="Açıklama" />
          <button class="btn primary" type="submit">Kaydet</button>
        </form>

        <div v-for="c in cinsleri" :key="c.id" class="list-item" @click="selectCins(c)">
          <span :class="['item-label', { active: selectedCins?.id === c.id }]">{{ c.ad }}</span>
          <button class="btn danger sm" @click.stop="deleteCins(c.id)">✕</button>
        </div>
      </div>

      <!-- Tipler -->
      <div class="col-card">
        <div class="col-header">
          <h3>Tipler <small v-if="selectedCins">({{ selectedCins.ad }})</small></h3>
          <button class="btn primary" :disabled="!selectedCins" @click="showTipForm = !showTipForm">+ Ekle</button>
        </div>

        <form v-if="showTipForm && selectedCins" class="inline-form" @submit.prevent="addTip">
          <input v-model="newTip.ad" placeholder="Tip adı (8I, K1...)" required />
          <input v-model="newTip.renk" type="color" title="Renk" />
          <button class="btn primary" type="submit">Kaydet</button>
        </form>

        <div v-if="!selectedCins" class="empty-hint">← Bir cins seçin</div>

        <div v-for="t in filteredTipler" :key="t.id" class="list-item">
          <span class="tip-dot" :style="{ background: t.renk }"></span>
          <span class="item-label">{{ t.ad }}</span>
          <button class="btn danger sm" @click="deleteTip(t.id)">✕</button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '../../composables/useApi'

const { get, post, del } = useApi()

const cinsleri   = ref([])
const tipler     = ref([])
const selectedCins = ref(null)
const showCinsForm = ref(false)
const showTipForm  = ref(false)

const newCins = ref({ ad: '', aciklama: '' })
const newTip  = ref({ ad: '', renk: '#3b82f6' })

const filteredTipler = computed(() =>
  tipler.value.filter(t => t.cins_id === selectedCins.value?.id)
)

onMounted(() => load())

async function load() {
  cinsleri.value = await get('/api/tipler/cins')
  tipler.value   = await get('/api/tipler')
}

function selectCins(c) { selectedCins.value = c; showTipForm.value = false }

async function addCins() {
  await post('/api/tipler/cins', newCins.value)
  newCins.value = { ad: '', aciklama: '' }
  showCinsForm.value = false
  await load()
}

async function deleteCins(id) {
  if (!confirm('Cinse ait tüm tipler de silinecek!')) return
  await del(`/api/tipler/cins/${id}`)
  if (selectedCins.value?.id === id) selectedCins.value = null
  await load()
}

async function addTip() {
  await post('/api/tipler', { cins_id: selectedCins.value.id, ...newTip.value })
  newTip.value = { ad: '', renk: '#3b82f6' }
  showTipForm.value = false
  await load()
}

async function deleteTip(id) {
  await del(`/api/tipler/${id}`)
  await load()
}
</script>

<style scoped>
.admin-section h2 { font-size: 1rem; margin-bottom: 1rem; }

.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

.col-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.col-header { display: flex; justify-content: space-between; align-items: center; }
.col-header h3 { font-size: 0.88rem; }

.inline-form { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.inline-form input { flex: 1; min-width: 80px; }

.list-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.4rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.list-item:hover { background: var(--bg-hover); }

.item-label { flex: 1; font-size: 0.82rem; }
.item-label.active { color: var(--accent); font-weight: 600; }

.tip-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

.btn.sm { font-size: 0.7rem; padding: 0.1rem 0.35rem; }
.empty-hint { font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 1rem; }
</style>
