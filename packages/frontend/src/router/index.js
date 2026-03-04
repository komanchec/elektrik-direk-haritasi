import { createRouter, createWebHistory } from 'vue-router'
import { useProjectStore } from '../stores/projectStore'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    name: 'map',
    component: () => import('../views/MapView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const store = useProjectStore()

  if (to.meta.requiresAuth && !store.token) {
    return { name: 'login' }
  }

  if (to.meta.requiresAdmin && store.user?.role !== 'admin') {
    return { name: 'map' }
  }

  if (to.name === 'login' && store.token) {
    return { name: 'map' }
  }
})

export default router
