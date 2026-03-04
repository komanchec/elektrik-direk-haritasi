<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="context-menu"
      :style="{ top: `${y}px`, left: `${x}px` }"
      @click.stop
    >
      <button
        v-for="item in items"
        :key="item.action"
        class="context-item"
        :class="{ separator: item.separator, danger: item.danger }"
        @click="handleItem(item)"
      >
        <span v-if="item.icon" class="ctx-icon">{{ item.icon }}</span>
        {{ item.label }}
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const visible = ref(false)
const x = ref(0)
const y = ref(0)
const items = ref([])
let callback = null

function open(event, menuItems, cb) {
  x.value = Math.min(event.clientX, window.innerWidth - 180)
  y.value = Math.min(event.clientY, window.innerHeight - 40 * menuItems.length)
  items.value = menuItems
  callback = cb
  visible.value = true
}

function close() {
  visible.value = false
  callback = null
}

function handleItem(item) {
  if (item.separator) return
  close()
  callback?.(item.action)
}

function onDocClick() { close() }
function onEsc(e) { if (e.key === 'Escape') close() }

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onEsc)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onEsc)
})

defineExpose({ open, close })
</script>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 9000;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  min-width: 170px;
  padding: 4px;
}

.context-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.45rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.82rem;
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.context-item:hover    { background: var(--bg-hover); }
.context-item.danger   { color: var(--danger); }
.context-item.separator { border-top: 1px solid var(--border-color); margin: 2px 0; padding: 0; height: 1px; cursor: default; }
.ctx-icon { font-size: 0.9rem; width: 16px; }
</style>
