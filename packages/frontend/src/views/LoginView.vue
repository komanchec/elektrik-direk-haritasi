<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">
        <span class="logo-icon">⚡</span>
        <h1>Elektrik Direk Haritası</h1>
        <p>CBS Tabanlı Yönetim Sistemi</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">Kullanıcı Adı</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            placeholder="admin"
            autocomplete="username"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Şifre</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            required
          />
        </div>

        <div v-if="error" class="login-error">{{ error }}</div>

        <button type="submit" class="btn-login" :disabled="loading">
          {{ loading ? 'Giriş yapılıyor...' : 'Giriş Yap' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../stores/projectStore'
import { useApi } from '../composables/useApi'

const router = useRouter()
const store  = useProjectStore()
const { post } = useApi()

const form    = reactive({ username: '', password: '' })
const loading = ref(false)
const error   = ref('')

async function handleLogin() {
  loading.value = true
  error.value   = ''

  try {
    const data = await post('/api/auth/login', {
      username: form.username,
      password: form.password
    })
    store.setAuth(data.token, data.user)
    router.push({ name: 'map' })
  } catch (err) {
    error.value = err.message || 'Giriş başarısız'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
}

.login-card {
  width: 100%;
  max-width: 380px;
  padding: 2.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.login-logo {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-icon {
  font-size: 2.5rem;
}

.login-logo h1 {
  font-size: 1.3rem;
  color: var(--text-primary);
  margin: 0.5rem 0 0.25rem;
}

.login-logo p {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.login-form { display: flex; flex-direction: column; gap: 1rem; }

.form-group { display: flex; flex-direction: column; gap: 0.4rem; }

.form-group label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.form-group input {
  padding: 0.6rem 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--accent);
}

.login-error {
  font-size: 0.8rem;
  color: var(--danger);
  padding: 0.5rem;
  background: color-mix(in srgb, var(--danger) 15%, transparent);
  border-radius: 4px;
}

.btn-login {
  padding: 0.7rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-login:hover:not(:disabled) { opacity: 0.85; }
.btn-login:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
