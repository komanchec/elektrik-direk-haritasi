<template>
  <div class="admin-section">
    <h2>Kullanıcılar</h2>

    <table class="data-table">
      <thead>
        <tr>
          <th>ID</th><th>Kullanıcı</th><th>Email</th><th>Rol</th><th>Oluşturulma</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id">
          <td>{{ u.id }}</td>
          <td>{{ u.username }}</td>
          <td>{{ u.email }}</td>
          <td><span :class="['role-badge', u.role]">{{ u.role }}</span></td>
          <td>{{ new Date(u.created_at).toLocaleDateString('tr-TR') }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useApi } from '../../composables/useApi'

const { get } = useApi()
const users = ref([])

onMounted(async () => { users.value = await get('/api/auth/users') })
</script>

<style scoped>
.admin-section h2 { font-size: 1rem; margin-bottom: 1rem; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
.data-table th, .data-table td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color); }
.data-table th { color: var(--text-muted); font-weight: 600; font-size: 0.75rem; }
.role-badge { padding: 0.1rem 0.4rem; border-radius: 3px; font-size: 0.73rem; font-weight: 700; }
.role-badge.admin { background: color-mix(in srgb, var(--accent) 20%, transparent); color: var(--accent); }
.role-badge.user  { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
</style>
