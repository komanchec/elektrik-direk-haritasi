<template>
  <aside :class="['sidebar', { collapsed }]">
    <!-- Collapse toggle -->
    <button class="collapse-btn" :title="collapsed ? 'Aç' : 'Kapat'" @click="collapsed = !collapsed">
      {{ collapsed ? '›' : '‹' }}
    </button>

    <div v-if="!collapsed" class="sidebar-content">

      <!-- Direk Ekle Formu -->
      <section class="sidebar-section">
        <div class="section-title" @click="toggle('addForm')">
          + Direk Ekle
          <span class="caret">{{ open.addForm ? '▲' : '▼' }}</span>
        </div>
        <div v-if="open.addForm" class="section-body">
          <DirekForm />
        </div>
      </section>

      <!-- Seçili Direk -->
      <section v-if="selectedDirek" class="sidebar-section">
        <div class="section-title" @click="toggle('direkDetail')">
          📍 {{ selectedDirek.numara }}
          <span class="caret">{{ open.direkDetail ? '▲' : '▼' }}</span>
        </div>
        <div v-if="open.direkDetail" class="section-body">
          <DirekDetail />
        </div>
      </section>

      <!-- Proje İstatistikleri -->
      <section v-if="currentProje" class="sidebar-section">
        <div class="section-title" @click="toggle('stats')">
          📊 İstatistikler
          <span class="caret">{{ open.stats ? '▲' : '▼' }}</span>
        </div>
        <div v-if="open.stats" class="section-body stats-body">
          <div class="stat-row">
            <span>Direkler</span>
            <strong>{{ direkCount }}</strong>
          </div>
          <div class="stat-row">
            <span>Hatlar</span>
            <strong>{{ hatCount }}</strong>
          </div>
        </div>
      </section>

      <!-- Filtreler -->
      <section class="sidebar-section">
        <div class="section-title" @click="toggle('filter')">
          🔍 Filtrele
          <span class="caret">{{ open.filter ? '▲' : '▼' }}</span>
        </div>
        <div v-if="open.filter" class="section-body">
          <FilterPanel />
        </div>
      </section>

    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useProjectStore } from '../../stores/projectStore'
import { useMapStore }     from '../../stores/mapStore'
import DirekForm   from '../direk/DirekForm.vue'
import DirekDetail from '../direk/DirekDetail.vue'
import FilterPanel from '../direk/FilterPanel.vue'

const projStore = useProjectStore()
const mapStore  = useMapStore()

const collapsed     = ref(false)
const selectedDirek = computed(() => projStore.selectedDirek)
const currentProje  = computed(() => projStore.currentProje)
const direkCount    = computed(() => mapStore.direkler.length)
const hatCount      = computed(() => mapStore.hatlar.length)

const open = ref({
  addForm:     false,
  direkDetail: true,
  stats:       true,
  filter:      false
})

function toggle(key) { open.value[key] = !open.value[key] }
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
  transition: width var(--transition-normal);
}

.sidebar.collapsed { width: 28px; }

.collapse-btn {
  position: absolute;
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
  width: 20px;
  height: 36px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.8rem;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 1rem;
}

.sidebar-section {
  border-bottom: 1px solid var(--border-color);
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.section-title:hover { background: var(--bg-hover); }
.caret { font-size: 0.65rem; opacity: 0.6; }

.section-body { padding: 0.6rem 0.75rem; }

.stats-body   { display: flex; flex-direction: column; gap: 0.4rem; }
.stat-row     { display: flex; justify-content: space-between; font-size: 0.82rem; }
.stat-row span { color: var(--text-muted); }
</style>
