<template>
  <form class="direk-form" @submit.prevent="handleSubmit">
    <div class="form-group">
      <label>Cins</label>
      <select v-model="form.cins_id" required @change="form.tip_id = ''">
        <option v-for="c in cinsleri" :key="c.id" :value="c.id">{{ c.ad }}</option>
      </select>
    </div>

    <div class="form-group">
      <label>Tip</label>
      <select v-model="form.tip_id" required>
        <option value="">— Seç —</option>
        <option v-for="t in filteredTipler" :key="t.id" :value="t.id">{{ t.ad }}</option>
      </select>
    </div>

    <div class="form-group">
      <label>Numara</label>
      <input v-model="form.numara" type="text" placeholder="D-001" maxlength="50" />
    </div>

    <div class="form-group">
      <label>Durum</label>
      <select v-model="form.durum">
        <option value="MEVCUT">MEVCUT</option>
        <option value="YENİ">YENİ</option>
        <option value="SÖKÜM">SÖKÜM</option>
      </select>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Enlem (Lat)</label>
        <input v-model.number="form.lat" type="number" step="any" placeholder="39.9334" />
      </div>
      <div class="form-group">
        <label>Boylam (Lng)</label>
        <input v-model.number="form.lng" type="number" step="any" placeholder="32.8597" />
      </div>
    </div>

    <button type="submit" class="btn primary" style="width:100%" :disabled="loading">
      {{ loading ? 'Ekleniyor...' : '+ Direk Ekle' }}
    </button>

    <div v-if="error" class="form-error">{{ error }}</div>
  </form>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useProjectStore } from '../../stores/projectStore'
import { useMapStore }     from '../../stores/mapStore'
import { useApi }          from '../../composables/useApi'

const projStore = useProjectStore()
const mapStore  = useMapStore()
const { post }  = useApi()

const loading = ref(false)
const error   = ref('')

const cinsleri = computed(() => projStore.direkCinsleri)
const filteredTipler = computed(() =>
  projStore.direkTipleri.filter(t => t.cins_id === form.cins_id)
)

const form = reactive({
  cins_id: projStore.direkCinsleri[0]?.id || '',
  tip_id: '',
  numara: '',
  durum: 'YENİ',
  lat: '',
  lng: ''
})

async function handleSubmit() {
  if (!projStore.currentProje) {
    error.value = 'Proje seçilmedi'
    return
  }
  if (!form.tip_id) {
    error.value = 'Tip seçilmedi'
    return
  }

  loading.value = true
  error.value   = ''

  try {
    await post('/api/direkler', {
      proje_id: projStore.currentProje.id,
      tip_id:   form.tip_id,
      cins_id:  form.cins_id,
      numara:   form.numara || `D-${Date.now()}`,
      lat:      form.lat,
      lng:      form.lng,
      durum:    form.durum
    })
    form.numara = ''
    form.lat    = ''
    form.lng    = ''
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.direk-form { display: flex; flex-direction: column; gap: 0.6rem; }
.form-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }
.form-group { display: flex; flex-direction: column; gap: 0.25rem; }
.form-error { font-size: 0.78rem; color: var(--danger); margin-top: 0.25rem; }
</style>
