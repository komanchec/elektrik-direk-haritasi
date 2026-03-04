<template>
  <div class="admin-section">
    <h2>İletken Tipleri</h2>

    <div class="card">
      <div class="card-header">
        <button class="btn primary" @click="showForm = !showForm">+ Yeni İletken Tipi</button>
      </div>

      <form v-if="showForm" class="inline-form" @submit.prevent="add">
        <input v-model="form.kod" placeholder="Kod (AAC, ACSR...)" required maxlength="20" style="text-transform:uppercase" />
        <input v-model="form.ad"  placeholder="Açıklama" required />
        <input v-model="form.renk" type="color" title="Renk" />
        <button class="btn primary" type="submit">Kaydet</button>
        <button class="btn" type="button" @click="showForm = false">İptal</button>
      </form>

      <div class="list-header">
        <span>Kod</span>
        <span>Ad</span>
        <span>Renk</span>
        <span></span>
      </div>

      <div v-for="t in iletkenler" :key="t.id" class="list-item">
        <span class="item-kod">{{ t.kod }}</span>
        <span class="item-ad">{{ t.ad }}</span>
        <span class="renk-dot" :style="{ background: t.renk }"></span>
        <button class="btn danger sm" @click="remove(t.id)">Sil</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useApi } from '../../composables/useApi'

const { get, post, del } = useApi()
const iletkenler = ref([])
const showForm   = ref(false)
const form = ref({ kod: '', ad: '', renk: '#3b82f6' })

onMounted(async () => { iletkenler.value = await get('/api/tipler/iletken') })

async function add() {
  await post('/api/tipler/iletken', form.value)
  form.value  = { kod: '', ad: '', renk: '#3b82f6' }
  showForm.value = false
  iletkenler.value = await get('/api/tipler/iletken')
}

async function remove(id) {
  if (!confirm('Silinsin mi?')) return
  await del(`/api/tipler/iletken/${id}`)
  iletkenler.value = iletkenler.value.filter(t => t.id !== id)
}
</script>

<style scoped>
.admin-section h2 { font-size: 1rem; margin-bottom: 1rem; }
.card { background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem; display: flex; flex-direction: column; gap: 0.5rem; }
.card-header { display: flex; }
.inline-form { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.inline-form input { flex: 1; min-width: 80px; }
.list-header { display: grid; grid-template-columns: 80px 1fr 40px 60px; gap: 0.5rem; font-size: 0.75rem; color: var(--text-muted); font-weight: 600; padding: 0.25rem 0.4rem; border-top: 1px solid var(--border-color); }
.list-item   { display: grid; grid-template-columns: 80px 1fr 40px 60px; gap: 0.5rem; align-items: center; padding: 0.35rem 0.4rem; border-radius: var(--radius-sm); font-size: 0.82rem; }
.list-item:hover { background: var(--bg-hover); }
.item-kod { font-weight: 700; font-family: monospace; }
.renk-dot { width: 16px; height: 16px; border-radius: 50%; justify-self: center; }
.btn.sm { font-size: 0.7rem; padding: 0.15rem 0.4rem; }
</style>
