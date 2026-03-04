import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'

// Zincirleme hat ve hat çizim state machine
export const useDrawingStore = defineStore('drawing', () => {
  // ── Hat çizim modu ────────────────────────────────────────────
  const hatCizimModu     = ref(false)
  const hatBaslangicDirek = ref(null) // { id, numara, lat, lng }
  const tempHatFeature   = shallowRef(null)

  function startHatCizim(direk) {
    hatCizimModu.value      = true
    hatBaslangicDirek.value = direk
  }

  function endHatCizim() {
    hatCizimModu.value      = false
    hatBaslangicDirek.value = null
    tempHatFeature.value    = null
  }

  // ── Zincirleme hat modu ───────────────────────────────────────
  // State machine: IDLE → CHAIN_DRAWING → IDLE
  const zincirlemeHatModu = ref(false)
  const zincirlemeSonDirek = ref(null)
  const zincirlemeHatlar  = ref([]) // tamamlanan hat feature'ları
  const seciliIletken     = ref(null)

  function startZincirleme(ilkDirek, iletken) {
    zincirlemeHatModu.value  = true
    zincirlemeSonDirek.value = ilkDirek
    seciliIletken.value      = iletken
    zincirlemeHatlar.value   = []
  }

  function addZincirHat(hat) {
    zincirlemeHatlar.value.push(hat)
    zincirlemeSonDirek.value = hat.direk2
  }

  function endZincirleme() {
    zincirlemeHatModu.value  = false
    zincirlemeSonDirek.value = null
    zincirlemeHatlar.value   = []
    seciliIletken.value      = null
  }

  // ── Çoklu seçim ───────────────────────────────────────────────
  const multiSelected = ref([]) // seçili direk id'leri

  function toggleMultiSelect(direkId) {
    const idx = multiSelected.value.indexOf(direkId)
    if (idx === -1) multiSelected.value.push(direkId)
    else multiSelected.value.splice(idx, 1)
  }

  function clearMultiSelect() {
    multiSelected.value = []
  }

  // ── Çizim bildirimleri (UI'ye) ───────────────────────────────
  const notification = ref(null) // { type, message }

  function notify(type, message) {
    notification.value = { type, message }
    setTimeout(() => { notification.value = null }, 3000)
  }

  return {
    // hat çizim
    hatCizimModu, hatBaslangicDirek, tempHatFeature,
    startHatCizim, endHatCizim,
    // zincirleme
    zincirlemeHatModu, zincirlemeSonDirek, zincirlemeHatlar, seciliIletken,
    startZincirleme, addZincirHat, endZincirleme,
    // çoklu seçim
    multiSelected, toggleMultiSelect, clearMultiSelect,
    // bildirimler
    notification, notify
  }
})
