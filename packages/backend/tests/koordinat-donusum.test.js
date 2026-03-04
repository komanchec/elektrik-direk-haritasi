/**
 * Koordinat dönüşüm birim testleri
 * Orijinal: /public/js/modules/koordinat-donusum.js
 * Migrasyon sırasında bu matematik değişmemeli.
 *
 * Çalıştır: npx vitest run tests/koordinat-donusum.test.js
 */
import { describe, it, expect } from 'vitest'
import { useKoordinatDonusum } from '../../frontend/src/composables/useKoordinatDonusum.js'

const {
  wgs84ToED50,
  ed50ToWGS84,
  wgs84ToGaussKruger,
  wgs84ToED506Deg,
  wgs84ToED503Deg,
  wgs84ToITRF963Deg,
  wgs84ToUTM
} = useKoordinatDonusum()

// Tolerans: 3 metre civarı (0.00003 derece ≈ 3 m)
const DEG_TOL = 0.0001
const M_TOL   = 5   // metre

// Test noktası: Ankara merkez
const ANKARA = { lat: 39.9334, lng: 32.8597, h: 930 }

// ── WGS84 ↔ ED50 ─────────────────────────────────────────────
describe('WGS84 → ED50', () => {
  it('Ankara koordinatlarını ED50\'ye dönüştürür', () => {
    const ed50 = wgs84ToED50(ANKARA.lat, ANKARA.lng, ANKARA.h)
    // ED50 koordinatları WGS84'ten yaklaşık 100-200 m kaymış olmalı
    expect(ed50.lat).toBeCloseTo(ANKARA.lat + 0.001, 2) // ~100 m kuzey
    expect(ed50.lng).toBeCloseTo(ANKARA.lng + 0.001, 2) // ~100 m doğu
  })

  it('Sonuç Türkiye sınırları içinde kalır (34°-43°K, 26°-45°D)', () => {
    const ed50 = wgs84ToED50(ANKARA.lat, ANKARA.lng, ANKARA.h)
    expect(ed50.lat).toBeGreaterThan(34)
    expect(ed50.lat).toBeLessThan(43)
    expect(ed50.lng).toBeGreaterThan(26)
    expect(ed50.lng).toBeLessThan(45)
  })
})

describe('ED50 → WGS84', () => {
  it('Türk elektrik şebekesi tipik ED50 koordinatını WGS84\'e çevirir', () => {
    // Tipik Türkiye ED50 koordinatı
    const wgs = ed50ToWGS84(39.9343, 32.8606)
    expect(wgs.lat).toBeCloseTo(ANKARA.lat, 2)
    expect(wgs.lng).toBeCloseTo(ANKARA.lng, 2)
  })
})

describe('Round-trip (WGS84 → ED50 → WGS84)', () => {
  it('Çift dönüşüm sonrası orijinal koordinata geri döner (tolerans 10 m)', () => {
    const ed50 = wgs84ToED50(ANKARA.lat, ANKARA.lng, ANKARA.h)
    const geri = ed50ToWGS84(ed50.lat, ed50.lng, ed50.h)
    expect(geri.lat).toBeCloseTo(ANKARA.lat, 3)
    expect(geri.lng).toBeCloseTo(ANKARA.lng, 3)
  })
})

// ── Gauss-Krüger ────────────────────────────────────────────
describe('WGS84 → Gauss-Krüger (3°)', () => {
  it('Ankara\'yı Gauss-Krüger\'e projekte eder', () => {
    const gk = wgs84ToGaussKruger(ANKARA.lat, ANKARA.lng, 3)
    // 33°CM: easting ~500000, northing ~4.4M (kuzey yarıküre)
    expect(gk.easting).toBeGreaterThan(490000)
    expect(gk.easting).toBeLessThan(510000)
    expect(gk.northing).toBeGreaterThan(4400000)
    expect(gk.northing).toBeLessThan(4500000)
  })

  it('Easting 500000\'e yakın (merkez meridyene yakın nokta)', () => {
    // 33°E meridyeninde bir nokta
    const gk = wgs84ToGaussKruger(ANKARA.lat, 33.0, 3)
    expect(Math.abs(gk.easting - 500000)).toBeLessThan(M_TOL * 100) // 500 m tolerans
  })
})

describe('WGS84 → ED50 6° Gauss-Krüger', () => {
  it('Türkiye standart harita projeksiyonuna dönüştürür', () => {
    const gk = wgs84ToED506Deg(ANKARA.lat, ANKARA.lng)
    expect(gk.northing).toBeGreaterThan(4000000)
    expect(gk.easting).toBeGreaterThan(200000)
    expect(gk.easting).toBeLessThan(800000)
  })
})

describe('WGS84 → ITRF96 3° Gauss-Krüger', () => {
  it('GRS80 elipsoidi ile dönüşüm yapar', () => {
    const gk = wgs84ToITRF963Deg(ANKARA.lat, ANKARA.lng)
    expect(gk.northing).toBeGreaterThan(4400000)
    expect(gk.easting).toBeGreaterThan(490000)
  })
})

// ── UTM ────────────────────────────────────────────────────
describe('WGS84 → UTM', () => {
  it('Ankara\'yı doğru UTM zonuna atar (Zone 36N)', () => {
    const utm = wgs84ToUTM(ANKARA.lat, ANKARA.lng)
    expect(utm.zone).toBe(36)
    expect(utm.hemisphere).toBe('N')
  })

  it('UTM easting ve northing makul sınırlar içinde', () => {
    const utm = wgs84ToUTM(ANKARA.lat, ANKARA.lng)
    expect(utm.easting).toBeGreaterThan(100000)
    expect(utm.easting).toBeLessThan(900000)
    expect(utm.northing).toBeGreaterThan(1000000)
    expect(utm.northing).toBeLessThan(10000000)
  })

  it('İstanbul UTM Zone 35N\'de kalır', () => {
    const istanbul = wgs84ToUTM(41.0082, 28.9784)
    expect(istanbul.zone).toBe(35)
    expect(istanbul.hemisphere).toBe('N')
  })

  it('Trabzon UTM Zone 37N\'de kalır', () => {
    const trabzon = wgs84ToUTM(41.0027, 39.7168)
    expect(trabzon.zone).toBe(37)
  })
})

// ── Ekstra kontroller ────────────────────────────────────────
describe('Sınır durumları', () => {
  it('Türkiye güneydoğu köşesi (Hatay) dönüşümü', () => {
    const hatay = wgs84ToUTM(36.2, 36.16)
    expect(hatay.zone).toBe(37)
    expect(hatay.hemisphere).toBe('N')
  })

  it('Türkiye kuzeybatı köşesi (Edirne) dönüşümü', () => {
    const edirne = wgs84ToUTM(41.67, 26.55)
    expect(edirne.zone).toBe(35)
  })
})
