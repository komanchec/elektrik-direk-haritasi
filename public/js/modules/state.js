// ============================================
// PAYLAŞILAN DURUM (Shared State)
// Tüm modüllerin eriştiği merkezi değişkenler
// ============================================

export const state = {
    API_URL: 'http://localhost:3000/api',
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || '{}'),

    map: null,
    markers: [],
    polylines: [],
    hatLabels: [],
    selectedDirek: null,
    currentTool: 'select',
    currentProject: null,
    measurePoints: [],
    linePoints: [],
    measureLine: null,

    // Zincirleme hat
    zincirlemeHatModu: false,
    zincirlemeSonDirek: null,
    zincirlemeHatlar: [],
    seciliIletken: null,

    // Hat çizim
    hatCizimModu: false,
    hatBaslangicDirek: null,
    tempHatLine: null,

    // Konum
    userLocationMarker: null,
    userLocationCircle: null
};
