// ============================================
// Koordinat Dönüşüm Modülü
// WGS84, ED50 6°, ITRF96 3°, ED50 3°
// Türkiye Haritacılık Standartları
// ============================================

import { state } from './state.js';

// ═══════════════════════════════════════
// ELLİPSOİD PARAMETRELERİ
// ═══════════════════════════════════════
const ELLIPSOIDS = {
    WGS84: { a: 6378137.0, f: 1 / 298.257223563 },
    GRS80: { a: 6378137.0, f: 1 / 298.257222101 },   // ITRF96
    INT24: { a: 6378388.0, f: 1 / 297.0 }            // ED50 (Hayford 1924)
};

// ═══════════════════════════════════════
// DATUM DÖNÜŞÜM PARAMETRELERİ (Türkiye)
// 7 Parametreli Helmert (Bursa-Wolf)
// Kaynak → WGS84 yönünde
// ═══════════════════════════════════════
const DATUM_PARAMS = {
    // ED50 → WGS84 (Türkiye ortalama)
    ED50_TO_WGS84: {
        dx: -84.0, dy: -97.0, dz: -117.0,
        rx: 0, ry: 0, rz: 0, // radyan
        ds: 0  // ppm
    },
    // ITRF96 → WGS84 (pratik olarak aynı, çok küçük farklar)
    ITRF96_TO_WGS84: {
        dx: 0.0, dy: 0.0, dz: 0.0,
        rx: 0, ry: 0, rz: 0,
        ds: 0
    }
};

// ═══════════════════════════════════════
// YARDIMCI MATEMATİK
// ═══════════════════════════════════════
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function calcEccentricity(ellipsoid) {
    const { a, f } = ellipsoid;
    const b = a * (1 - f);
    const e2 = (a * a - b * b) / (a * a);
    const ep2 = (a * a - b * b) / (b * b);
    return { a, b, f, e2, ep2 };
}

// ═══════════════════════════════════════
// COĞRAFİ → KARTEZİK (XYZ)
// ═══════════════════════════════════════
function geographicToCartesian(lat, lng, h, ellipsoid) {
    const { a, e2 } = calcEccentricity(ellipsoid);
    const phi = lat * DEG2RAD;
    const lam = lng * DEG2RAD;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);

    const X = (N + h) * cosPhi * Math.cos(lam);
    const Y = (N + h) * cosPhi * Math.sin(lam);
    const Z = (N * (1 - e2) + h) * sinPhi;
    return { X, Y, Z };
}

// ═══════════════════════════════════════
// KARTEZİK → COĞRAFİ
// ═══════════════════════════════════════
function cartesianToGeographic(X, Y, Z, ellipsoid) {
    const { a, b, e2, ep2 } = calcEccentricity(ellipsoid);
    const p = Math.sqrt(X * X + Y * Y);
    const theta = Math.atan2(Z * a, p * b);
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    const phi = Math.atan2(
        Z + ep2 * b * sinTheta * sinTheta * sinTheta,
        p - e2 * a * cosTheta * cosTheta * cosTheta
    );
    const lam = Math.atan2(Y, X);
    const sinPhi = Math.sin(phi);
    const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
    const h = p / Math.cos(phi) - N;

    return { lat: phi * RAD2DEG, lng: lam * RAD2DEG, h };
}

// ═══════════════════════════════════════
// HELMERT DÖNÜŞÜMÜ (3 parametre - Molodensky kısayol)
// ═══════════════════════════════════════
function helmertTransform(X, Y, Z, params) {
    const { dx, dy, dz, rx, ry, rz, ds } = params;
    const s = 1 + ds * 1e-6;
    return {
        X: dx + s * (X - rz * Y + ry * Z),
        Y: dy + s * (rz * X + Y - rx * Z),
        Z: dz + s * (-ry * X + rx * Y + Z)
    };
}

function inverseHelmert(X, Y, Z, params) {
    const inv = {
        dx: -params.dx, dy: -params.dy, dz: -params.dz,
        rx: -params.rx, ry: -params.ry, rz: -params.rz,
        ds: -params.ds
    };
    return helmertTransform(X, Y, Z, inv);
}

// ═══════════════════════════════════════
// TRANSVERSE MERCATOR PROJEKSİYON
// (UTM ve Gauss-Krüger ortak matematik)
// ═══════════════════════════════════════
function geographicToTM(lat, lng, centralMeridian, k0, falseEasting, falseNorthing, ellipsoid) {
    const { a, e2 } = calcEccentricity(ellipsoid);
    const ep2 = e2 / (1 - e2);

    const phi = lat * DEG2RAD;
    const dLam = (lng - centralMeridian) * DEG2RAD;

    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const tanPhi = Math.tan(phi);
    const T = tanPhi * tanPhi;
    const C = ep2 * cosPhi * cosPhi;
    const A = cosPhi * dLam;
    const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);

    // Meridyen yayı uzunluğu (M)
    const e4 = e2 * e2;
    const e6 = e4 * e2;
    const M = a * (
        (1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * phi
        - (3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * phi)
        + (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * phi)
        - (35 * e6 / 3072) * Math.sin(6 * phi)
    );

    const A2 = A * A;
    const A3 = A2 * A;
    const A4 = A3 * A;
    const A5 = A4 * A;
    const A6 = A5 * A;

    const easting = falseEasting + k0 * N * (
        A + (1 - T + C) * A3 / 6
        + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A5 / 120
    );

    const northing = falseNorthing + k0 * (
        M + N * tanPhi * (
            A2 / 2 + (5 - T + 9 * C + 4 * C * C) * A4 / 24
            + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A6 / 720
        )
    );

    return { easting, northing };
}

function tmToGeographic(easting, northing, centralMeridian, k0, falseEasting, falseNorthing, ellipsoid) {
    const { a, e2 } = calcEccentricity(ellipsoid);
    const ep2 = e2 / (1 - e2);

    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const M1 = (northing - falseNorthing) / k0;

    const e4 = e2 * e2;
    const e6 = e4 * e2;

    const mu = M1 / (a * (1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256));

    const phi1 = mu
        + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
        + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
        + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu)
        + (1097 * e1 * e1 * e1 * e1 / 512) * Math.sin(8 * mu);

    const sinPhi1 = Math.sin(phi1);
    const cosPhi1 = Math.cos(phi1);
    const tanPhi1 = Math.tan(phi1);
    const N1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
    const R1 = a * (1 - e2) / Math.pow(1 - e2 * sinPhi1 * sinPhi1, 1.5);
    const T1 = tanPhi1 * tanPhi1;
    const C1 = ep2 * cosPhi1 * cosPhi1;
    const D = (easting - falseEasting) / (N1 * k0);
    const D2 = D * D;
    const D3 = D2 * D;
    const D4 = D3 * D;
    const D5 = D4 * D;
    const D6 = D5 * D;

    const lat = (phi1 - (N1 * tanPhi1 / R1) * (
        D2 / 2
        - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D4 / 24
        + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D6 / 720
    )) * RAD2DEG;

    const lng = (centralMeridian * DEG2RAD + (
        D - (1 + 2 * T1 + C1) * D3 / 6
        + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D5 / 120
    ) / cosPhi1) * RAD2DEG;

    return { lat, lng };
}

// ═══════════════════════════════════════
// DİLİM / ZONE TESPİTİ
// ═══════════════════════════════════════
function getUTM6Zone(lng) {
    return Math.floor((lng + 180) / 6) + 1;
}

function getUTM6CentralMeridian(zone) {
    return (zone - 1) * 6 - 180 + 3;
}

function getGK3CentralMeridian(lng) {
    // 3°'lik dilimler: orta meridyen en yakın 3'ün katı
    return Math.round(lng / 3) * 3;
}

// ═══════════════════════════════════════
// ANA DÖNÜŞÜM FONKSİYONLARI
// ═══════════════════════════════════════

// WGS84 Coğrafi → Tüm diğer sistemlere
function wgs84ToAll(lat, lng) {
    const results = {};

    // 1) WGS84 Coğrafi (zaten elimizde)
    results.wgs84 = { lat, lng };

    // 2) WGS84 UTM (bilgi amaçlı)
    const utmZone = getUTM6Zone(lng);
    const utmCM = getUTM6CentralMeridian(utmZone);
    const wgsUTM = geographicToTM(lat, lng, utmCM, 0.9996, 500000, 0, ELLIPSOIDS.WGS84);
    results.wgs84_utm = { ...wgsUTM, zone: utmZone, cm: utmCM };

    // 3) ED50 Coğrafi (WGS84 → ED50)
    const wgsXYZ = geographicToCartesian(lat, lng, 0, ELLIPSOIDS.WGS84);
    const ed50XYZ = inverseHelmert(wgsXYZ.X, wgsXYZ.Y, wgsXYZ.Z, DATUM_PARAMS.ED50_TO_WGS84);
    const ed50Geo = cartesianToGeographic(ed50XYZ.X, ed50XYZ.Y, ed50XYZ.Z, ELLIPSOIDS.INT24);
    results.ed50 = { lat: ed50Geo.lat, lng: ed50Geo.lng };

    // 4) ED50 6° UTM
    const ed50UtmZone = getUTM6Zone(ed50Geo.lng);
    const ed50UtmCM = getUTM6CentralMeridian(ed50UtmZone);
    const ed50UTM = geographicToTM(ed50Geo.lat, ed50Geo.lng, ed50UtmCM, 0.9996, 500000, 0, ELLIPSOIDS.INT24);
    results.ed50_6 = { ...ed50UTM, zone: ed50UtmZone, cm: ed50UtmCM };

    // 5) ED50 3° Gauss-Krüger
    const ed50GK3CM = getGK3CentralMeridian(ed50Geo.lng);
    const ed50GK3 = geographicToTM(ed50Geo.lat, ed50Geo.lng, ed50GK3CM, 1.0, 500000, 0, ELLIPSOIDS.INT24);
    results.ed50_3 = { ...ed50GK3, cm: ed50GK3CM, dilim: ed50GK3CM };

    // 6) ITRF96 Coğrafi (WGS84 ≈ ITRF96, pratik aynı)
    results.itrf96 = { lat, lng };

    // 7) ITRF96 3° TM (GRS80 elipsoid, k0=1)
    const itrf3CM = getGK3CentralMeridian(lng);
    const itrf3 = geographicToTM(lat, lng, itrf3CM, 1.0, 500000, 0, ELLIPSOIDS.GRS80);
    results.itrf96_3 = { ...itrf3, cm: itrf3CM, dilim: itrf3CM };

    return results;
}

// Herhangi bir sistemden → WGS84 → Tümüne
function convertFromSystem(systemType, value1, value2, zone) {
    let wgsLat, wgsLng;

    switch (systemType) {
        case 'wgs84':
            wgsLat = value1;
            wgsLng = value2;
            break;

        case 'ed50':
            // ED50 Coğrafi → WGS84
            const edXYZ = geographicToCartesian(value1, value2, 0, ELLIPSOIDS.INT24);
            const wXYZ = helmertTransform(edXYZ.X, edXYZ.Y, edXYZ.Z, DATUM_PARAMS.ED50_TO_WGS84);
            const wGeo = cartesianToGeographic(wXYZ.X, wXYZ.Y, wXYZ.Z, ELLIPSOIDS.WGS84);
            wgsLat = wGeo.lat;
            wgsLng = wGeo.lng;
            break;

        case 'ed50_6': {
            // ED50 UTM 6° → ED50 Coğrafi → WGS84
            const cm = getUTM6CentralMeridian(zone || 36);
            const ed50G = tmToGeographic(value1, value2, cm, 0.9996, 500000, 0, ELLIPSOIDS.INT24);
            const xyz = geographicToCartesian(ed50G.lat, ed50G.lng, 0, ELLIPSOIDS.INT24);
            const w = helmertTransform(xyz.X, xyz.Y, xyz.Z, DATUM_PARAMS.ED50_TO_WGS84);
            const g = cartesianToGeographic(w.X, w.Y, w.Z, ELLIPSOIDS.WGS84);
            wgsLat = g.lat;
            wgsLng = g.lng;
            break;
        }

        case 'ed50_3': {
            // ED50 3° GK → ED50 Coğrafi → WGS84
            const cm = zone || 33;
            const ed50G = tmToGeographic(value1, value2, cm, 1.0, 500000, 0, ELLIPSOIDS.INT24);
            const xyz = geographicToCartesian(ed50G.lat, ed50G.lng, 0, ELLIPSOIDS.INT24);
            const w = helmertTransform(xyz.X, xyz.Y, xyz.Z, DATUM_PARAMS.ED50_TO_WGS84);
            const g = cartesianToGeographic(w.X, w.Y, w.Z, ELLIPSOIDS.WGS84);
            wgsLat = g.lat;
            wgsLng = g.lng;
            break;
        }

        case 'itrf96_3': {
            // ITRF96 3° → Coğrafi (GRS80) ≈ WGS84
            const cm = zone || 33;
            const geo = tmToGeographic(value1, value2, cm, 1.0, 500000, 0, ELLIPSOIDS.GRS80);
            wgsLat = geo.lat;
            wgsLng = geo.lng;
            break;
        }

        default:
            wgsLat = value1;
            wgsLng = value2;
    }

    return wgs84ToAll(wgsLat, wgsLng);
}

// ═══════════════════════════════════════
// KULLANICI ARAYÜZÜ
// ═══════════════════════════════════════

let coordModal = null;
let mapClickHandler = null;

function formatCoord(v, decimals = 6) {
    return typeof v === 'number' ? v.toFixed(decimals) : '-';
}

function formatTM(v, decimals = 3) {
    return typeof v === 'number' ? v.toFixed(decimals) : '-';
}

function showCoordModal(initialLat, initialLng) {
    // Eğer zaten açıksa kapat
    if (coordModal) {
        coordModal.remove();
        coordModal = null;
    }

    coordModal = document.createElement('div');
    coordModal.className = 'coord-converter-panel';
    coordModal.innerHTML = `
        <div class="coord-panel-header">
            <h3>🌐 Koordinat Dönüşümü</h3>
            <button class="coord-close-btn" id="coordCloseBtn">✕</button>
        </div>

        <!-- Giriş -->
        <div class="coord-input-section">
            <div class="coord-input-row">
                <label>Kaynak Sistem:</label>
                <select id="coordSourceSystem">
                    <option value="wgs84">WGS84 Coğrafi (Lat/Lng)</option>
                    <option value="ed50">ED50 Coğrafi (Lat/Lng)</option>
                    <option value="ed50_6">ED50 6° UTM (Y/X)</option>
                    <option value="ed50_3">ED50 3° GK (Y/X)</option>
                    <option value="itrf96_3">ITRF96 3° TM (Y/X)</option>
                </select>
            </div>
            <div class="coord-input-row coord-values">
                <div>
                    <label id="coordLabel1">Enlem (Lat):</label>
                    <input type="text" id="coordInput1" placeholder="39.920000">
                </div>
                <div>
                    <label id="coordLabel2">Boylam (Lng):</label>
                    <input type="text" id="coordInput2" placeholder="32.854000">
                </div>
            </div>
            <div class="coord-input-row" id="coordZoneRow" style="display:none;">
                <label>Dilim / Zone:</label>
                <select id="coordZoneSelect">
                    <option value="35">35 (27°)</option>
                    <option value="36" selected>36 (33°)</option>
                    <option value="37">37 (39°)</option>
                    <option value="38">38 (45°)</option>
                </select>
            </div>
            <div class="coord-btn-row">
                <button class="btn btn-primary" id="coordConvertBtn" style="margin:0;">🔄 Dönüştür</button>
                <button class="btn btn-success" id="coordMapPickBtn" style="margin:0;">📍 Haritadan Al</button>
            </div>
        </div>

        <!-- Sonuçlar -->
        <div class="coord-results" id="coordResults" style="display:none;">
            <div class="coord-result-group">
                <div class="coord-result-title">🌍 WGS84 Coğrafi</div>
                <div class="coord-result-values">
                    <span>Lat: <b id="resWgsLat">-</b></span>
                    <span>Lng: <b id="resWgsLng">-</b></span>
                </div>
            </div>
            <div class="coord-result-divider"></div>

            <div class="coord-result-group">
                <div class="coord-result-title">📐 ED50 6° UTM</div>
                <div class="coord-result-values">
                    <span>Y (Easting): <b id="resEd50_6E">-</b></span>
                    <span>X (Northing): <b id="resEd50_6N">-</b></span>
                    <span class="coord-zone-info" id="resEd50_6Zone"></span>
                </div>
            </div>
            <div class="coord-result-divider"></div>

            <div class="coord-result-group">
                <div class="coord-result-title">📏 ED50 3° Gauss-Krüger</div>
                <div class="coord-result-values">
                    <span>Y (Sağa): <b id="resEd50_3E">-</b></span>
                    <span>X (Yukarı): <b id="resEd50_3N">-</b></span>
                    <span class="coord-zone-info" id="resEd50_3Zone"></span>
                </div>
            </div>
            <div class="coord-result-divider"></div>

            <div class="coord-result-group">
                <div class="coord-result-title">📡 ITRF96 3° TM</div>
                <div class="coord-result-values">
                    <span>Y (Sağa): <b id="resItrf3E">-</b></span>
                    <span>X (Yukarı): <b id="resItrf3N">-</b></span>
                    <span class="coord-zone-info" id="resItrf3Zone"></span>
                </div>
            </div>
            <div class="coord-result-divider"></div>

            <div class="coord-result-group">
                <div class="coord-result-title">🗺️ ED50 Coğrafi</div>
                <div class="coord-result-values">
                    <span>Lat: <b id="resEd50Lat">-</b></span>
                    <span>Lng: <b id="resEd50Lng">-</b></span>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(coordModal);

    // Olay dinleyicileri
    document.getElementById('coordCloseBtn').onclick = () => {
        coordModal.remove();
        coordModal = null;
        disableMapPick();
    };

    document.getElementById('coordSourceSystem').onchange = (e) => {
        updateInputLabels(e.target.value);
    };

    document.getElementById('coordConvertBtn').onclick = doConvert;

    document.getElementById('coordMapPickBtn').onclick = () => {
        enableMapPick();
    };

    // İlk değerleri doldur
    if (initialLat && initialLng) {
        document.getElementById('coordInput1').value = initialLat.toFixed(6);
        document.getElementById('coordInput2').value = initialLng.toFixed(6);
        doConvert();
    }
}

function updateInputLabels(system) {
    const l1 = document.getElementById('coordLabel1');
    const l2 = document.getElementById('coordLabel2');
    const zoneRow = document.getElementById('coordZoneRow');
    const zoneSelect = document.getElementById('coordZoneSelect');

    if (system === 'wgs84' || system === 'ed50') {
        l1.textContent = 'Enlem (Lat):';
        l2.textContent = 'Boylam (Lng):';
        zoneRow.style.display = 'none';
    } else if (system === 'ed50_6') {
        l1.textContent = 'Y (Easting):';
        l2.textContent = 'X (Northing):';
        zoneRow.style.display = 'flex';
        // 6°'lik UTM zone listesi
        zoneSelect.innerHTML = `
            <option value="35">Zone 35 (27°E)</option>
            <option value="36" selected>Zone 36 (33°E)</option>
            <option value="37">Zone 37 (39°E)</option>
            <option value="38">Zone 38 (45°E)</option>
        `;
    } else {
        l1.textContent = 'Y (Sağa / Easting):';
        l2.textContent = 'X (Yukarı / Northing):';
        zoneRow.style.display = 'flex';
        // 3°'lik dilim listesi
        zoneSelect.innerHTML = `
            <option value="27">27° Dilimi</option>
            <option value="30">30° Dilimi</option>
            <option value="33" selected>33° Dilimi</option>
            <option value="36">36° Dilimi</option>
            <option value="39">39° Dilimi</option>
            <option value="42">42° Dilimi</option>
            <option value="45">45° Dilimi</option>
        `;
    }
}

function doConvert() {
    const sys = document.getElementById('coordSourceSystem').value;
    const v1 = parseFloat(document.getElementById('coordInput1').value);
    const v2 = parseFloat(document.getElementById('coordInput2').value);

    if (isNaN(v1) || isNaN(v2)) {
        alert('Lütfen geçerli koordinat değerleri girin.');
        return;
    }

    let zone = null;
    if (sys === 'ed50_6' || sys === 'ed50_3' || sys === 'itrf96_3') {
        zone = parseInt(document.getElementById('coordZoneSelect').value);
    }

    const results = convertFromSystem(sys, v1, v2, zone);
    displayResults(results);
}

function displayResults(r) {
    document.getElementById('coordResults').style.display = 'block';

    // WGS84 Coğrafi
    document.getElementById('resWgsLat').textContent = formatCoord(r.wgs84.lat);
    document.getElementById('resWgsLng').textContent = formatCoord(r.wgs84.lng);

    // ED50 6° UTM
    document.getElementById('resEd50_6E').textContent = formatTM(r.ed50_6.easting);
    document.getElementById('resEd50_6N').textContent = formatTM(r.ed50_6.northing);
    document.getElementById('resEd50_6Zone').textContent = `Zone ${r.ed50_6.zone} | CM: ${r.ed50_6.cm}°`;

    // ED50 3° GK
    document.getElementById('resEd50_3E').textContent = formatTM(r.ed50_3.easting);
    document.getElementById('resEd50_3N').textContent = formatTM(r.ed50_3.northing);
    document.getElementById('resEd50_3Zone').textContent = `Dilim: ${r.ed50_3.cm}°`;

    // ITRF96 3°
    document.getElementById('resItrf3E').textContent = formatTM(r.itrf96_3.easting);
    document.getElementById('resItrf3N').textContent = formatTM(r.itrf96_3.northing);
    document.getElementById('resItrf3Zone').textContent = `Dilim: ${r.itrf96_3.cm}°`;

    // ED50 Coğrafi
    document.getElementById('resEd50Lat').textContent = formatCoord(r.ed50.lat);
    document.getElementById('resEd50Lng').textContent = formatCoord(r.ed50.lng);
}

function enableMapPick() {
    if (mapClickHandler) disableMapPick();

    const btn = document.getElementById('coordMapPickBtn');
    btn.textContent = '📍 Haritaya tıklayın...';
    btn.style.background = '#f59e0b';

    mapClickHandler = (e) => {
        const { lat, lng } = e.latlng;
        document.getElementById('coordSourceSystem').value = 'wgs84';
        updateInputLabels('wgs84');
        document.getElementById('coordInput1').value = lat.toFixed(6);
        document.getElementById('coordInput2').value = lng.toFixed(6);
        doConvert();
        disableMapPick();
    };

    state.map.once('click', mapClickHandler);
}

function disableMapPick() {
    if (mapClickHandler) {
        state.map.off('click', mapClickHandler);
        mapClickHandler = null;
    }
    const btn = document.getElementById('coordMapPickBtn');
    if (btn) {
        btn.textContent = '📍 Haritadan Al';
        btn.style.background = '';
    }
}

// ═══════════════════════════════════════
// CSS STİLLERİ (Panel tasarımı)
// ═══════════════════════════════════════
function injectCoordStyles() {
    if (document.getElementById('coord-styles')) return;
    const style = document.createElement('style');
    style.id = 'coord-styles';
    style.textContent = `
        .coord-converter-panel {
            position: absolute;
            top: 60px;
            left: 360px;
            width: 420px;
            max-height: calc(100vh - 100px);
            overflow-y: auto;
            background: var(--bg-glass);
            backdrop-filter: blur(24px);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-lg);
            z-index: 1200;
            padding: 0;
            animation: modalSlideIn 0.25s ease;
            font-family: var(--font-primary);
            color: var(--text-primary);
        }
        .coord-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-subtle);
        }
        .coord-panel-header h3 {
            font-size: 15px;
            font-weight: 700;
            margin: 0;
        }
        .coord-close-btn {
            background: var(--bg-hover);
            border: 1px solid var(--border-subtle);
            color: var(--text-muted);
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 13px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .coord-close-btn:hover {
            background: var(--danger-soft);
            color: var(--danger);
        }
        .coord-input-section {
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-subtle);
        }
        .coord-input-row {
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .coord-input-row label {
            font-size: 11px;
            color: var(--text-secondary);
            font-weight: 500;
            min-width: 100px;
        }
        .coord-input-row select,
        .coord-input-row input {
            flex: 1;
            padding: 8px 10px;
            border: 1px solid var(--border-input);
            border-radius: var(--radius-md);
            background: var(--bg-input);
            color: var(--text-primary);
            font-size: 13px;
            font-family: var(--font-primary);
        }
        .coord-input-row select:focus,
        .coord-input-row input:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 2px var(--accent-soft);
        }
        .coord-values {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }
        .coord-values > div { display: flex; flex-direction: column; gap: 4px; }
        .coord-values label { min-width: auto; }
        .coord-btn-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 4px;
        }
        .coord-btn-row .btn {
            padding: 8px;
            font-size: 12px;
            width: 100%;
        }
        .coord-results {
            padding: 12px 20px 16px;
        }
        .coord-result-group {
            padding: 8px 0;
        }
        .coord-result-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--accent);
            margin-bottom: 6px;
        }
        .coord-result-values {
            display: flex;
            flex-direction: column;
            gap: 3px;
            font-size: 12px;
            color: var(--text-secondary);
        }
        .coord-result-values b {
            color: var(--text-primary);
            font-family: var(--font-mono);
            font-size: 12px;
            letter-spacing: 0.3px;
        }
        .coord-zone-info {
            font-size: 10px;
            color: var(--text-muted);
            background: var(--bg-hover);
            padding: 2px 8px;
            border-radius: 4px;
            display: inline-block;
            margin-top: 2px;
            width: fit-content;
        }
        .coord-result-divider {
            height: 1px;
            background: var(--border-subtle);
        }
    `;
    document.head.appendChild(style);
}

// ═══════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════
export function koordinatDonusumAc(lat, lng) {
    injectCoordStyles();
    showCoordModal(lat, lng);
}

// Harita üzerinden (context menu'den vb.) açmak için
export function koordinatDonusumHaritadan() {
    injectCoordStyles();
    const center = state.map.getCenter();
    showCoordModal(center.lat, center.lng);
}

export { wgs84ToAll, convertFromSystem };
