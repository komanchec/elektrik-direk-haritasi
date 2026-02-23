// ============================================
// API İLETİŞİMİ
// ============================================
import { state } from './state.js';

export async function api(url, options = {}) {
    const res = await fetch(`${state.API_URL}${url}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${state.token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (res.status === 401) {
        localStorage.clear();
        window.location.href = '/login.html';
        return;
    }

    return res.json();
}
