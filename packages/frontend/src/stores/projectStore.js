import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '../composables/useApi'

export const useProjectStore = defineStore('project', () => {
  // ── Auth ─────────────────────────────────────────────────────
  const token = ref(localStorage.getItem('token') || null)
  const user  = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  function setAuth(newToken, newUser) {
    token.value = newToken
    user.value  = newUser
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  function clearAuth() {
    token.value = null
    user.value  = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const isAdmin = computed(() => user.value?.role === 'admin')

  // ── Projeler ─────────────────────────────────────────────────
  const projeler     = ref([])
  const currentProje = ref(null)

  async function loadProjeler() {
    const { get } = useApi()
    projeler.value = await get('/api/projeler')
  }

  async function createProje(ad, aciklama) {
    const { post } = useApi()
    const result = await post('/api/projeler', { ad, aciklama })
    await loadProjeler()
    return result
  }

  async function deleteProje(id) {
    const { del } = useApi()
    await del(`/api/projeler/${id}`)
    if (currentProje.value?.id === id) currentProje.value = null
    await loadProjeler()
  }

  function selectProje(proje) {
    currentProje.value = proje
  }

  // ── Seçili Direk ─────────────────────────────────────────────
  const selectedDirek = ref(null)

  function selectDirek(direk) {
    selectedDirek.value = direk
  }

  // ── Direk/Hat Tipleri (referans veriler) ─────────────────────
  const direkTipleri  = ref([])
  const direkCinsleri = ref([])
  const iletkenTipleri = ref([])

  async function loadTipler() {
    const { get } = useApi()
    const [tipler, cinsler, iletkenler] = await Promise.all([
      get('/api/tipler'),
      get('/api/tipler/cins'),
      get('/api/tipler/iletken')
    ])
    direkTipleri.value   = tipler
    direkCinsleri.value  = cinsler
    iletkenTipleri.value = iletkenler
  }

  return {
    // auth
    token, user, isAdmin, setAuth, clearAuth,
    // projeler
    projeler, currentProje, loadProjeler, createProje, deleteProje, selectProje,
    // direk
    selectedDirek, selectDirek,
    // tipler
    direkTipleri, direkCinsleri, iletkenTipleri, loadTipler
  }
})
