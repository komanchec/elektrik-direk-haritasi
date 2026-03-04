import { useProjectStore } from '../stores/projectStore'
import router from '../router'

/**
 * API isteklerini merkezi olarak yöneten composable.
 * Token ekler, 401 → login sayfasına yönlendirir.
 */
export function useApi() {
  function getHeaders() {
    const store = useProjectStore()
    return {
      'Content-Type': 'application/json',
      ...(store.token ? { Authorization: `Bearer ${store.token}` } : {})
    }
  }

  async function request(method, url, body) {
    const opts = { method, headers: getHeaders() }
    if (body !== undefined) opts.body = JSON.stringify(body)

    const res = await fetch(url, opts)

    if (res.status === 401) {
      useProjectStore().clearAuth()
      router.push({ name: 'login' })
      throw new Error('Oturum süresi doldu')
    }

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`)
    }

    return data
  }

  return {
    get:   (url)        => request('GET',    url),
    post:  (url, body)  => request('POST',   url, body),
    put:   (url, body)  => request('PUT',    url, body),
    patch: (url, body)  => request('PATCH',  url, body),
    del:   (url)        => request('DELETE', url),
  }
}
