/**
 * Koordinat dönüşüm composable.
 * Orijinal koordinat-donusum.js'den saf matematik fonksiyonları buraya taşındı.
 * UI mantığı ayrı tutuldu — doğrudan component içinde kullanılır.
 *
 * Referans: /public/js/modules/koordinat-donusum.js
 * Değişiklik: ES module export'a çevrildi (import → değişken yok)
 */

// ── Elipsoid Parametreleri ────────────────────────────────────
const ELLIPSOIDS = {
  WGS84: { a: 6378137.0, f: 1 / 298.257223563 },
  GRS80: { a: 6378137.0, f: 1 / 298.257222101 },
  INT24: { a: 6378388.0, f: 1 / 297.0 }
}

// ── Datum Parametreleri (Türkiye) ─────────────────────────────
const DATUM_PARAMS = {
  ED50_TO_WGS84:   { dx: -84.0, dy: -97.0, dz: -117.0, rx: 0, ry: 0, rz: 0, ds: 0 },
  ITRF96_TO_WGS84: { dx: 0.0,   dy: 0.0,   dz: 0.0,    rx: 0, ry: 0, rz: 0, ds: 0 }
}

const DEG2RAD = Math.PI / 180
const RAD2DEG = 180 / Math.PI

function calcEccentricity(ellipsoid) {
  const { a, f } = ellipsoid
  const b   = a * (1 - f)
  const e2  = (a * a - b * b) / (a * a)
  const ep2 = (a * a - b * b) / (b * b)
  return { a, b, f, e2, ep2 }
}

function geographicToCartesian(lat, lng, h, ellipsoid) {
  const { a, e2 } = calcEccentricity(ellipsoid)
  const phi = lat * DEG2RAD
  const lam = lng * DEG2RAD
  const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi)
  const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi)
  return {
    X: (N + h) * cosPhi * Math.cos(lam),
    Y: (N + h) * cosPhi * Math.sin(lam),
    Z: (N * (1 - e2) + h) * sinPhi
  }
}

function cartesianToGeographic(X, Y, Z, ellipsoid) {
  const { a, b, e2, ep2 } = calcEccentricity(ellipsoid)
  const p = Math.sqrt(X * X + Y * Y)
  const theta = Math.atan2(Z * a, p * b)
  const sinTheta = Math.sin(theta), cosTheta = Math.cos(theta)
  const phi = Math.atan2(
    Z + ep2 * b * sinTheta ** 3,
    p - e2  * a * cosTheta ** 3
  )
  const lam = Math.atan2(Y, X)
  const sinPhi = Math.sin(phi)
  const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi)
  const h = p / Math.cos(phi) - N
  return { lat: phi * RAD2DEG, lng: lam * RAD2DEG, h }
}

function applyHelmert(xyz, params) {
  const { dx, dy, dz, rx, ry, rz, ds } = params
  const scale = 1 + ds * 1e-6
  return {
    X: dx + scale * (xyz.X - rz * xyz.Y + ry * xyz.Z),
    Y: dy + scale * (rz * xyz.X + xyz.Y - rx * xyz.Z),
    Z: dz + scale * (-ry * xyz.X + rx * xyz.Y + xyz.Z)
  }
}

// ── Gauss-Krüger Projeksiyonu ─────────────────────────────────
function toGaussKruger(lat, lng, ellipsoid, cm) {
  const { a, f } = ellipsoid
  const b = a * (1 - f)
  const e2 = (a * a - b * b) / (a * a)
  const n  = (a - b) / (a + b)
  const phi = lat * DEG2RAD
  const lam = (lng - cm) * DEG2RAD

  const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi)
  const tanPhi = Math.tan(phi)
  const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi)
  const t = tanPhi * tanPhi
  const c = e2 / (1 - e2) * cosPhi * cosPhi
  const A = cosPhi * lam

  const M = a * (
    (1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256) * phi -
    (3*e2/8 + 3*e2*e2/32 + 45*e2*e2*e2/1024) * Math.sin(2*phi) +
    (15*e2*e2/256 + 45*e2*e2*e2/1024) * Math.sin(4*phi) -
    (35*e2*e2*e2/3072) * Math.sin(6*phi)
  )

  const x = M + N * tanPhi * (
    A*A/2 +
    (5 - t + 9*c + 4*c*c) * A**4/24 +
    (61 - 58*t + t*t + 600*c - 330*e2/(1-e2)) * A**6/720
  )

  const y = N * (
    A +
    (1 - t + c) * A**3/6 +
    (5 - 18*t + t*t + 72*c - 58*e2/(1-e2)) * A**5/120
  )

  return { northing: x, easting: y + 500000 }
}

// ── UTM ───────────────────────────────────────────────────────
function toUTM(lat, lng) {
  const zone = Math.floor((lng + 180) / 6) + 1
  const cm   = (zone - 1) * 6 - 180 + 3
  const result = toGaussKruger(lat, lng, ELLIPSOIDS.WGS84, cm)
  const northing = lat >= 0 ? result.northing : result.northing + 10000000
  return { zone, easting: result.easting, northing, hemisphere: lat >= 0 ? 'N' : 'S' }
}

// ── Public API ────────────────────────────────────────────────
export function useKoordinatDonusum() {
  function wgs84ToED50(lat, lng, h = 0) {
    const xyz = geographicToCartesian(lat, lng, h, ELLIPSOIDS.WGS84)
    const params = {
      dx: 84.0, dy: 97.0, dz: 117.0, rx: 0, ry: 0, rz: 0, ds: 0
    }
    const ed50xyz = applyHelmert(xyz, params)
    return cartesianToGeographic(ed50xyz.X, ed50xyz.Y, ed50xyz.Z, ELLIPSOIDS.INT24)
  }

  function ed50ToWGS84(lat, lng, h = 0) {
    const xyz    = geographicToCartesian(lat, lng, h, ELLIPSOIDS.INT24)
    const wgsxyz = applyHelmert(xyz, DATUM_PARAMS.ED50_TO_WGS84)
    return cartesianToGeographic(wgsxyz.X, wgsxyz.Y, wgsxyz.Z, ELLIPSOIDS.WGS84)
  }

  function wgs84ToGaussKruger(lat, lng, dereceBandI = 3) {
    const cm = Math.round(lng / dereceBandI) * dereceBandI
    return toGaussKruger(lat, lng, ELLIPSOIDS.WGS84, cm)
  }

  function wgs84ToED506Deg(lat, lng) {
    const ed50 = wgs84ToED50(lat, lng)
    const cm   = Math.floor(ed50.lng / 6) * 6 + 3
    return toGaussKruger(ed50.lat, ed50.lng, ELLIPSOIDS.INT24, cm)
  }

  function wgs84ToED503Deg(lat, lng) {
    const ed50 = wgs84ToED50(lat, lng)
    const cm   = Math.round(ed50.lng / 3) * 3
    return toGaussKruger(ed50.lat, ed50.lng, ELLIPSOIDS.INT24, cm)
  }

  function wgs84ToITRF963Deg(lat, lng) {
    const cm = Math.round(lng / 3) * 3
    return toGaussKruger(lat, lng, ELLIPSOIDS.GRS80, cm)
  }

  function wgs84ToUTM(lat, lng) {
    return toUTM(lat, lng)
  }

  return {
    wgs84ToED50,
    ed50ToWGS84,
    wgs84ToGaussKruger,
    wgs84ToED506Deg,
    wgs84ToED503Deg,
    wgs84ToITRF963Deg,
    wgs84ToUTM
  }
}
