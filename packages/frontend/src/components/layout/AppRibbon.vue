<template>
  <div class="ribbon">
    <!-- Logo -->
    <div class="ribbon-logo">⚡ DirekHarita</div>

    <!-- Araç grupları -->
    <div class="ribbon-groups">

      <!-- Seçim & Düzenleme -->
      <div class="ribbon-group">
        <button
          :class="['ribbon-btn', { active: currentTool === 'select' }]"
          title="Seç (S)"
          @click="setTool('select')"
        >
          ↖ Seç
        </button>
        <button
          :class="['ribbon-btn', { active: currentTool === 'addDirek' }]"
          title="Direk Ekle (D)"
          @click="setTool('addDirek')"
        >
          + Direk
        </button>
        <button
          :class="['ribbon-btn', { active: currentTool === 'measure' }]"
          title="Ölçüm (M)"
          @click="setTool('measure')"
        >
          📏 Ölç
        </button>
      </div>

      <div class="ribbon-sep"></div>

      <!-- Proje -->
      <div class="ribbon-group">
        <button class="ribbon-btn" @click="$emit('yeniProje')">📁 Yeni Proje</button>
        <select class="ribbon-select" :value="currentProjeId" @change="onProjeChange">
          <option value="">— Proje Seç —</option>
          <option v-for="p in projeler" :key="p.id" :value="p.id">
            {{ p.ad }}
          </option>
        </select>
      </div>

      <div class="ribbon-sep"></div>

      <!-- Import/Export -->
      <div class="ribbon-group">
        <button class="ribbon-btn" @click="$emit('gpxImport')">⬆ GPX/KML</button>
        <button class="ribbon-btn" @click="$emit('excelImport')">📊 Excel</button>
        <button class="ribbon-btn" @click="$emit('dxfImport')">📐 DXF</button>
        <button class="ribbon-btn" @click="$emit('pdfRapor')">📄 Rapor</button>
      </div>

      <div class="ribbon-sep"></div>

      <!-- Analiz -->
      <div class="ribbon-group">
        <button class="ribbon-btn" @click="$emit('hatAnaliz')">🔗 Hat Analiz</button>
        <button class="ribbon-btn" @click="$emit('metraj')">📏 Metraj</button>
        <button class="ribbon-btn" @click="$emit('maliyet')">💰 Maliyet</button>
      </div>
    </div>

    <!-- Sağ köşe -->
    <div class="ribbon-right">
      <button class="ribbon-btn" title="Tema" @click="toggleTheme">🌓</button>
      <RouterLink v-if="isAdmin" to="/admin" class="ribbon-btn admin-link">⚙ Admin</RouterLink>
      <button class="ribbon-btn danger" @click="logout">Çıkış</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useMapStore }     from '../../stores/mapStore'
import { useProjectStore } from '../../stores/projectStore'

defineEmits(['yeniProje','gpxImport','excelImport','dxfImport','pdfRapor','hatAnaliz','metraj','maliyet'])

const mapStore  = useMapStore()
const projStore = useProjectStore()
const router    = useRouter()

const currentTool    = computed(() => mapStore.currentTool)
const projeler       = computed(() => projStore.projeler)
const currentProjeId = computed(() => projStore.currentProje?.id ?? '')
const isAdmin        = computed(() => projStore.isAdmin)

function setTool(tool) { mapStore.setTool(tool) }

function onProjeChange(e) {
  const id = parseInt(e.target.value)
  const proje = projStore.projeler.find(p => p.id === id) || null
  projStore.selectProje(proje)
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark'
  const next = current === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  localStorage.setItem('theme', next)
}

function logout() {
  projStore.clearAuth()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.ribbon {
  display: flex;
  align-items: center;
  height: var(--ribbon-height);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  padding: 0 0.5rem;
  gap: 0.25rem;
  overflow-x: auto;
  flex-shrink: 0;
  user-select: none;
}

.ribbon-logo {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--accent);
  padding: 0 0.5rem;
  white-space: nowrap;
}

.ribbon-groups {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
}

.ribbon-group {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.ribbon-sep {
  width: 1px;
  height: 24px;
  background: var(--border-color);
  margin: 0 0.25rem;
}

.ribbon-right {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  margin-left: auto;
}

.ribbon-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.55rem;
  font-size: 0.78rem;
  font-weight: 500;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
  text-decoration: none;
}

.ribbon-btn:hover,
.ribbon-btn.active {
  background: var(--accent-light);
  border-color: var(--accent);
  color: var(--accent);
}

.ribbon-btn.danger       { color: var(--danger); }
.ribbon-btn.danger:hover { background: color-mix(in srgb, var(--danger) 15%, transparent); border-color: var(--danger); }

.ribbon-select {
  height: 26px;
  font-size: 0.78rem;
  padding: 0 0.5rem;
  width: 160px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  cursor: pointer;
}
</style>
