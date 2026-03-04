<template>
  <div class="admin-section">
    <h2>İşlem Geçmişi</h2>

    <div class="audit-list">
      <div v-for="log in logs" :key="log.id" class="audit-item">
        <span class="audit-time">{{ formatDate(log.created_at) }}</span>
        <span class="audit-user">{{ log.username }}</span>
        <span class="audit-action">{{ log.islem }}</span>
        <span class="audit-detail">{{ log.detay }}</span>
      </div>
      <div v-if="logs.length === 0" class="empty-hint">Henüz işlem kaydı yok</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useApi } from '../../composables/useApi'

const { get } = useApi()
const logs = ref([])

onMounted(async () => { logs.value = await get('/api/audit') })

function formatDate(dt) {
  return new Date(dt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}
</script>

<style scoped>
.admin-section h2 { font-size: 1rem; margin-bottom: 1rem; }
.audit-list { display: flex; flex-direction: column; gap: 0.2rem; max-height: 500px; overflow-y: auto; }
.audit-item { display: grid; grid-template-columns: 110px 90px 120px 1fr; gap: 0.5rem; align-items: center; padding: 0.4rem 0.5rem; border-radius: var(--radius-sm); font-size: 0.8rem; }
.audit-item:nth-child(even) { background: var(--bg-tertiary); }
.audit-time   { color: var(--text-muted); font-family: monospace; font-size: 0.73rem; }
.audit-user   { font-weight: 600; }
.audit-action { color: var(--accent); font-family: monospace; font-size: 0.75rem; }
.audit-detail { color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.empty-hint   { color: var(--text-muted); text-align: center; padding: 2rem; font-size: 0.85rem; }
</style>
