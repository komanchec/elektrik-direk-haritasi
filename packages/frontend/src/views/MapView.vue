<template>
  <div class="app-layout">
    <!-- Üst Ribbon -->
    <AppRibbon />

    <!-- Ana içerik -->
    <div class="app-body">
      <!-- Sol Panel -->
      <AppSidebar />

      <!-- Harita -->
      <div class="map-container">
        <OLMap ref="mapRef" />
      </div>
    </div>

    <!-- Alt durum çubuğu -->
    <AppStatusBar />

    <!-- Global bildirimler -->
    <NotificationSystem />

    <!-- Context menü -->
    <ContextMenu />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useProjectStore } from '../stores/projectStore'
import AppRibbon      from '../components/layout/AppRibbon.vue'
import AppSidebar     from '../components/layout/AppSidebar.vue'
import AppStatusBar   from '../components/layout/AppStatusBar.vue'
import OLMap          from '../components/map/OLMap.vue'
import NotificationSystem from '../components/ui/NotificationSystem.vue'
import ContextMenu    from '../components/ui/ContextMenu.vue'

const projectStore = useProjectStore()

onMounted(async () => {
  await Promise.all([
    projectStore.loadProjeler(),
    projectStore.loadTipler()
  ])
})
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary);
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.map-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}
</style>
