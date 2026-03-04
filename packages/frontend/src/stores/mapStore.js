import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'

// shallowRef: OpenLayers Map objesi reaktiviteden muaf tutulur (perf)
export const useMapStore = defineStore('map', () => {
  // ── OpenLayers map instance ───────────────────────────────────
  const map        = shallowRef(null)
  const direkLayer = shallowRef(null)
  const hatLayer   = shallowRef(null)

  function setMap(olMap) {
    map.value = olMap
  }

  function setLayers({ direkLayer: dl, hatLayer: hl }) {
    direkLayer.value = dl
    hatLayer.value   = hl
  }

  // ── Aktif araç ───────────────────────────────────────────────
  const currentTool = ref('select') // 'select' | 'addDirek' | 'measure' | 'polygon'

  function setTool(tool) {
    currentTool.value = tool
  }

  // ── Direkler ve Hatlar (ham veri) ────────────────────────────
  const direkler = ref([])
  const hatlar   = ref([])

  function setDirekler(list) { direkler.value = list }
  function setHatlar(list)   { hatlar.value   = list }

  // ── Ölçüm ────────────────────────────────────────────────────
  const measurePoints  = ref([])
  const measureLineRef = shallowRef(null)

  function clearMeasure() {
    measurePoints.value = []
    measureLineRef.value = null
  }

  // ── Harita koordinat durumu ──────────────────────────────────
  const cursorCoords = ref({ lat: 0, lng: 0 })
  const zoomLevel    = ref(6)

  function updateCursor(lat, lng) {
    cursorCoords.value = { lat, lng }
  }

  function updateZoom(z) {
    zoomLevel.value = z
  }

  // ── Konum takibi ─────────────────────────────────────────────
  const userLocationFeature = shallowRef(null)

  return {
    map, direkLayer, hatLayer, setMap, setLayers,
    currentTool, setTool,
    direkler, hatlar, setDirekler, setHatlar,
    measurePoints, measureLineRef, clearMeasure,
    cursorCoords, zoomLevel, updateCursor, updateZoom,
    userLocationFeature
  }
})
