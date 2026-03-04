<template>
  <div class="admin-layout">
    <div class="admin-header">
      <h1>⚙️ Admin Paneli</h1>
      <RouterLink to="/" class="btn-back">← Haritaya Dön</RouterLink>
    </div>

    <div class="admin-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="admin-content">
      <!-- Direk Cinsleri & Tipleri -->
      <DirekTipYonetimi v-if="activeTab === 'tipler'" />

      <!-- İletken Tipleri -->
      <IletkenYonetimi v-if="activeTab === 'iletkenler'" />

      <!-- Malzeme Yönetimi -->
      <MalzemeYonetimi v-if="activeTab === 'malzemeler'" />

      <!-- Kullanıcılar -->
      <KullaniciYonetimi v-if="activeTab === 'kullanicilar'" />

      <!-- Audit Log -->
      <AuditLog v-if="activeTab === 'audit'" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

// Bileşenler aşamalı olarak oluşturulacak — şimdilik lazy import
import DirekTipYonetimi  from '../components/admin/DirekTipYonetimi.vue'
import IletkenYonetimi   from '../components/admin/IletkenYonetimi.vue'
import MalzemeYonetimi   from '../components/admin/MalzemeYonetimi.vue'
import KullaniciYonetimi from '../components/admin/KullaniciYonetimi.vue'
import AuditLog          from '../components/admin/AuditLog.vue'

const activeTab = ref('tipler')

const tabs = [
  { id: 'tipler',      label: 'Direk Tipleri' },
  { id: 'iletkenler',  label: 'İletken Tipleri' },
  { id: 'malzemeler',  label: 'Malzemeler' },
  { id: 'kullanicilar',label: 'Kullanıcılar' },
  { id: 'audit',       label: 'İşlem Geçmişi' },
]
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.admin-header h1 { font-size: 1.2rem; }

.btn-back {
  font-size: 0.85rem;
  color: var(--accent);
  text-decoration: none;
}

.admin-tabs {
  display: flex;
  gap: 0.25rem;
  padding: 0.75rem 1.5rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.tab-btn {
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn.active, .tab-btn:hover {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}

.admin-content {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
