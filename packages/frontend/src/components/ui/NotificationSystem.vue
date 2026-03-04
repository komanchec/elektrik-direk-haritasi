<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite">
      <TransitionGroup name="toast-anim">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast', toast.type]"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

// Global bildirim fonksiyonu — window üzerinden erişilebilir (geçiş döneminde)
function showNotification(message, type = 'info', duration = 3000) {
  const id = ++nextId
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }, duration)
}

// Pinia kullanmak yerine provide ile yukarıya açıyoruz
defineExpose({ showNotification })
</script>

<style scoped>
.toast-anim-enter-active { transition: all 0.2s ease; }
.toast-anim-leave-active { transition: all 0.2s ease; }
.toast-anim-enter-from   { transform: translateX(110%); opacity: 0; }
.toast-anim-leave-to     { transform: translateX(110%); opacity: 0; }
</style>
