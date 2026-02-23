// ============================================
// KONUM & NAVİGASYON
// ============================================
import { state } from './state.js';
import { showNotification } from './ui.js';

export function konumumuGoster() {
    if (!navigator.geolocation) {
        alert('Tarayıcınız konum desteklemiyor!');
        return;
    }

    showNotification('Konumunuz alınıyor...', 'info');

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            if (state.userLocationMarker) {
                state.map.removeLayer(state.userLocationMarker);
                state.map.removeLayer(state.userLocationCircle);
            }

            state.userLocationMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'user-location',
                    html: '<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(state.map);

            state.userLocationCircle = L.circle([lat, lng], {
                radius: accuracy,
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 1
            }).addTo(state.map);

            state.map.panTo([lat, lng]);
            showNotification(`Konumunuz: ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${Math.round(accuracy)}m)`, 'success');

            enYakinDirekBul(lat, lng);
        },
        (err) => {
            showNotification('Konum alınamadı: ' + err.message, 'error');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

export function enYakinDirekBul(userLat, userLng) {
    if (!state.currentProject || state.markers.length === 0) return;

    let enYakin = null;
    let minMesafe = Infinity;

    state.markers.forEach(m => {
        const mesafe = state.map.distance([userLat, userLng], [m.data.lat, m.data.lng]);
        if (mesafe < minMesafe) {
            minMesafe = mesafe;
            enYakin = m;
        }
    });

    if (enYakin) {
        const mesafeMetre = Math.round(minMesafe);

        showNotification(
            `En yakın direk: ${enYakin.data.numara} (${mesafeMetre}m)`,
            'info'
        );

        if (window.yolTarifiLine) state.map.removeLayer(window.yolTarifiLine);

        window.yolTarifiLine = L.polyline(
            [[userLat, userLng], [enYakin.data.lat, enYakin.data.lng]],
            { color: '#10b981', weight: 4, dashArray: '10, 10' }
        ).addTo(state.map);
    }
}

export function yolTarifiAl() {
    if (!state.selectedDirek) {
        alert('Önce bir direk seçin!');
        return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${state.selectedDirek.lat},${state.selectedDirek.lng}`;
    window.open(url, '_blank');
}
