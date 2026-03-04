<template>
  <div class="statusbar">
    <span class="status-item">
      <span :class="['dot', isOnline ? 'online' : 'offline']"></span>
      {{ isOnline ? 'Bağlı' : 'Çevrimdışı' }}
    </span>

    <span class="status-divider">|</span>

    <span class="status-item" title="Koordinatlar">
      {{ lat.toFixed(6) }}°N, {{ lng.toFixed(6) }}°E
    </span>

    <span class="status-divider">|</span>

    <span class="status-item">Zoom {{ zoom }}</span>

    <span class="status-divider">|</span>

    <span class="status-item">
      {{ direkCount }} direk &nbsp;·&nbsp; {{ hatCount }} hat
    </span>

    <div class="status-right">
      <span class="status-item">{{ user?.username ?? '' }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useOnline } from '@vueuse/core'
import { useMapStore } from '../../stores/mapStore'
import { useProjectStore } from '../../stores/projectStore'

const mapStore  = useMapStore()
const projStore = useProjectStore()

// @vueuse/core yoksa basit fallback
const isOnline = typeof useOnline === 'function' ? useOnline() : true

const lat   = computed(() => mapStore.cursorCoords.lat)
const lng   = computed(() => mapStore.cursorCoords.lng)
const zoom  = computed(() => mapStore.zoomLevel)
const direkCount = computed(() => mapStore.direkler.length)
const hatCount   = computed(() => mapStore.hatlar.length)
const user  = computed(() => projStore.user)
</script>

<style scoped>
.statusbar {
  display: flex;
  align-items: center;
  height: var(--statusbar-height);
  padding: 0 0.75rem;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  font-size: 0.73rem;
  color: var(--text-muted);
  gap: 0.5rem;
  user-select: none;
}

.status-item   { display: flex; align-items: center; gap: 0.3rem; }
.status-divider { opacity: 0.3; }

.dot {
  width: 7px; height: 7px;
  border-radius: 50%;
}
.dot.online  { background: var(--success); }
.dot.offline { background: var(--danger); }

.status-right { margin-left: auto; }
</style>
