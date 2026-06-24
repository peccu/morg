import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/inbox',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/login-success',
      name: 'login-success',
      component: () => import('@/views/LoginSuccessView.vue'),
    },
    {
      path: '/inbox',
      name: 'inbox',
      component: () => import('@/views/InboxView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/thread/:id',
      name: 'thread',
      component: () => import('@/views/ThreadView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/info',
      name: 'info',
      component: () => import('@/views/InfoView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth) {
    if (!auth.initialized) await auth.checkAuth()
    if (!auth.isAuthenticated) return { name: 'login' }
  }
})

export default router
