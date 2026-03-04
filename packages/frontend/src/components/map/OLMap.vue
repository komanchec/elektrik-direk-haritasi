<template>
  <div ref="mapContainer" class="ol-map-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import OSM from 'ol/source/OSM'
import XYZ from 'ol/source/XYZ'
import { fromLonLat, toLonLat } from 'ol/proj'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import LineString from 'ol/geom/LineString'
import { Style, Fill, Stroke, Circle as CircleStyle, Text } from 'ol/style'
import Select from 'ol/interaction/Select'
import Translate from 'ol/interaction/Translate'
import { click } from 'ol/events/condition'
import ScaleLine from 'ol/control/ScaleLine'
import 'ol/ol.css'

import { useMapStore }     from '../../stores/mapStore'
import { useProjectStore } from '../../stores/projectStore'
import { useDrawingStore } from '../../stores/drawingStore'
import { useApi }          from '../../composables/useApi'

const mapContainer = ref(null)
const mapStore     = useMapStore()
const projectStore = useProjectStore()
const drawStore    = useDrawingStore()
const { get, post, del } = useApi()

let map, direkSource, hatSource, selectInteraction, translateInteraction

// ── Style fonksiyonu ─────────────────────────────────────────
function direkStyle(feature, resolution) {
  const props  = feature.getProperties()
  const renk   = props.renk || '#3b82f6'
  const durum  = props.durum || 'MEVCUT'
  const radius = resolution < 5 ? 8 : resolution < 15 ? 6 : 4

  const strokeColor = durum === 'YENİ' ? '#10b981'
                    : durum === 'SÖKÜM' ? '#ef4444'
                    : renk

  return new Style({
    image: new CircleStyle({
      radius,
      fill:   new Fill({ color: renk }),
      stroke: new Stroke({ color: strokeColor, width: durum === 'YENİ' ? 2.5 : 1.5 })
    }),
    text: resolution < 8 ? new Text({
      text: props.numara || '',
      font: '11px sans-serif',
      fill: new Fill({ color: '#fff' }),
      stroke: new Stroke({ color: '#000', width: 3 }),
      offsetY: -14
    }) : null
  })
}

function hatStyle(feature) {
  const renk = feature.get('iletken_renk') || '#94a3b8'
  return new Style({
    stroke: new Stroke({ color: renk, width: 2 })
  })
}

function selectedStyle(feature) {
  return new Style({
    image: new CircleStyle({
      radius: 10,
      fill:   new Fill({ color: feature.get('renk') || '#3b82f6' }),
      stroke: new Stroke({ color: '#fff', width: 3 })
    })
  })
}

// ── Haritayı yükle ────────────────────────────────────────────
onMounted(() => {
  direkSource = new VectorSource()
  hatSource   = new VectorSource()

  const direkLayer = new VectorLayer({ source: direkSource, style: direkStyle, zIndex: 10 })
  const hatLayer   = new VectorLayer({ source: hatSource,   style: hatStyle,   zIndex: 5  })

  const osmLayer       = new TileLayer({ source: new OSM(), title: 'OSM' })
  const satelliteLayer = new TileLayer({
    source: new XYZ({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 19
    }),
    title: 'Uydu',
    visible: false
  })

  map = new Map({
    target: mapContainer.value,
    layers: [osmLayer, satelliteLayer, hatLayer, direkLayer],
    view: new View({
      center: fromLonLat([32.8597, 39.9334]),
      zoom: 6,
      maxZoom: 19
    }),
    controls: [new ScaleLine()]
  })

  // ── Select etkileşimi ────────────────────────────────────────
  selectInteraction = new Select({
    condition: click,
    layers: [direkLayer],
    style: selectedStyle
  })

  selectInteraction.on('select', (e) => {
    if (e.selected.length > 0) {
      const f = e.selected[0]
      projectStore.selectDirek(f.getProperties())
    } else {
      projectStore.selectDirek(null)
    }
  })

  // ── Sürükleme etkileşimi ─────────────────────────────────────
  translateInteraction = new Translate({
    features: selectInteraction.getFeatures()
  })

  translateInteraction.on('translateend', async (e) => {
    const feature = e.features.getArray()[0]
    if (!feature) return

    const [lng, lat] = toLonLat(feature.getGeometry().getCoordinates())
    const id = feature.get('id')

    try {
      const props = feature.getProperties()
      await post(`/api/direkler/${id}`, {
        tip_id: props.tip_id, cins_id: props.cins_id,
        numara: props.numara, lat, lng, durum: props.durum
      })
      feature.set('lat', lat)
      feature.set('lng', lng)
    } catch (err) {
      console.error('Direk konum güncelleme hatası:', err)
      // Geri al
      feature.getGeometry().setCoordinates(fromLonLat([feature.get('lng'), feature.get('lat')]))
    }
  })

  map.addInteraction(selectInteraction)
  map.addInteraction(translateInteraction)

  // ── Harita tıklama (direk ekleme modu) ───────────────────────
  map.on('click', async (e) => {
    if (mapStore.currentTool !== 'addDirek') return

    const [lng, lat] = toLonLat(e.coordinate)
    const proje = projectStore.currentProje
    if (!proje) return drawStore.notify('warning', 'Önce bir proje seçin')

    try {
      const { id } = await post('/api/direkler', {
        proje_id: proje.id,
        tip_id:   projectStore.direkTipleri[0]?.id || 1,
        cins_id:  projectStore.direkCinsleri[0]?.id || 1,
        numara:   `D-${Date.now()}`,
        lat, lng,
        durum: 'YENİ'
      })
      await loadDirekler(proje.id)
      drawStore.notify('success', 'Direk eklendi')
    } catch (err) {
      drawStore.notify('error', err.message)
    }
  })

  // ── Fare hareketi → koordinat bilgisi ────────────────────────
  map.on('pointermove', (e) => {
    const [lng, lat] = toLonLat(e.coordinate)
    mapStore.updateCursor(lat, lng)
  })

  // ── Zoom değişimi ─────────────────────────────────────────────
  map.getView().on('change:resolution', () => {
    mapStore.updateZoom(Math.round(map.getView().getZoom()))
  })

  mapStore.setMap(map)
  mapStore.setLayers({ direkLayer, hatLayer })
})

// ── Proje değişince veri yükle ────────────────────────────────
watch(() => projectStore.currentProje, async (proje) => {
  direkSource.clear()
  hatSource.clear()
  mapStore.setDirekler([])
  mapStore.setHatlar([])

  if (!proje) return

  await Promise.all([
    loadDirekler(proje.id),
    loadHatlar(proje.id)
  ])
}, { immediate: true })

async function loadDirekler(projeId) {
  try {
    const direkler = await get(`/api/direkler/proje/${projeId}`)
    mapStore.setDirekler(direkler)
    direkSource.clear()

    direkler.forEach(d => {
      const f = new Feature({
        geometry: new Point(fromLonLat([d.lng, d.lat])),
        ...d
      })
      f.setId(d.id)
      direkSource.addFeature(f)
    })
  } catch (err) {
    console.error('Direkler yükleme hatası:', err)
  }
}

async function loadHatlar(projeId) {
  try {
    const hatlar = await get(`/api/direkler/proje/${projeId}/hatlar`)
    mapStore.setHatlar(hatlar)
    hatSource.clear()

    hatlar.forEach(h => {
      const coords = [
        fromLonLat([h.direk1_lng, h.direk1_lat]),
        fromLonLat([h.direk2_lng, h.direk2_lat])
      ]
      const f = new Feature({ geometry: new LineString(coords), ...h })
      f.setId(`hat-${h.id}`)
      hatSource.addFeature(f)
    })
  } catch (err) {
    console.error('Hatlar yükleme hatası:', err)
  }
}

onBeforeUnmount(() => {
  map?.setTarget(null)
})
</script>

<style>
/* :deep olmadan tanımla — OL viewport scoped style dışında kalır */
.ol-map-container {
  width: 100%;
  height: 100%;
}

.ol-map-container .ol-viewport {
  cursor: crosshair;
}
</style>
