<template>
  <RouterView />
</template>

<script setup>
import { RouterView } from 'vue-router'
import { useProjectStore } from './stores/projectStore'
import { onMounted } from 'vue'

const projectStore = useProjectStore()

onMounted(() => {
  // Kayıtlı tema tercihini uygula
  const theme = localStorage.getItem('theme') || 'dark'
  document.documentElement.setAttribute('data-theme', theme)
})
</script>
