<template>
  <div class="filter-panel">
    <div class="form-group">
      <label>Direk Ara</label>
      <input v-model="searchQ" type="text" placeholder="Numara ara..." @input="onSearch" />
    </div>

    <div class="form-group">
      <label>Durum Filtrele</label>
      <div class="checkbox-group">
        <label v-for="d in durumlar" :key="d" class="checkbox-item">
          <input type="checkbox" :value="d" v-model="selectedDurumlar" @change="onFilter" />
          {{ d }}
        </label>
      </div>
    </div>

    <div class="form-group">
      <label>Cins Filtrele</label>
      <select v-model="selectedCins" @change="onFilter">
        <option value="">Tümü</option>
        <option v-for="c in cinsleri" :key="c.id" :value="c.id">{{ c.ad }}</option>
      </select>
    </div>

    <button class="btn" style="width:100%" @click="clearFilters">Filtreleri Temizle</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useProjectStore } from '../../stores/projectStore'
import { useMapStore }     from '../../stores/mapStore'

const projStore = useProjectStore()
const mapStore  = useMapStore()

const searchQ        = ref('')
const selectedDurumlar = ref(['MEVCUT', 'YENİ'])
const selectedCins   = ref('')

const durumlar = ['MEVCUT', 'YENİ', 'SÖKÜM']
const cinsleri = computed(() => projStore.direkCinsleri)

function onSearch() { applyFilters() }
function onFilter() { applyFilters() }

function applyFilters() {
  // Haritadaki feature'ları göster/gizle
  const layer = mapStore.direkLayer
  if (!layer) return

  layer.getSource().getFeatures().forEach(f => {
    const props  = f.getProperties()
    const durumOk = selectedDurumlar.value.length === 0 || selectedDurumlar.value.includes(props.durum)
    const cinsOk  = !selectedCins.value || props.cins_id === selectedCins.value
    const searchOk = !searchQ.value || props.numara?.toLowerCase().includes(searchQ.value.toLowerCase())
    f.setStyle(durumOk && cinsOk && searchOk ? undefined : new (window.ol?.style?.Style ?? Object)())
  })
}

function clearFilters() {
  searchQ.value         = ''
  selectedDurumlar.value = ['MEVCUT', 'YENİ']
  selectedCins.value    = ''
  const layer = mapStore.direkLayer
  layer?.getSource().getFeatures().forEach(f => f.setStyle(undefined))
}
</script>

<style scoped>
.filter-panel { display: flex; flex-direction: column; gap: 0.6rem; }
.checkbox-group { display: flex; flex-direction: column; gap: 0.3rem; margin-top: 0.2rem; }
.checkbox-item  { display: flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; color: var(--text-primary); cursor: pointer; }
.checkbox-item input { width: auto; cursor: pointer; }
</style>
