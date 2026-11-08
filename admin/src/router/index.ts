import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { clearAdminSession, getAdminRefreshToken, getAdminToken } from '@/services/session'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
    component: () => import('../views/layout/AdminLayout.vue'),
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/dashboard/index.vue'), meta: { title: '今日工作台' } },
      { path: 'analytics', name: 'Analytics', component: () => import('../views/analytics/index.vue'), meta: { title: '趋势分析' } },
      { path: 'users', name: 'Users', component: () => import('../views/users/index.vue'), meta: { title: '用户管理' } },
      { path: 'family', name: 'Family', component: () => import('../views/family/index.vue'), meta: { title: '家庭关系' } },
      { path: 'volunteers', name: 'Volunteers', component: () => import('../views/volunteers/index.vue'), meta: { title: '志愿者管理' } },
      { path: 'health', name: 'Health', component: () => import('../views/health/index.vue'), meta: { title: '健康监管' } },
      { path: 'medication', name: 'Medication', component: () => import('../views/medication/index.vue'), meta: { title: '用药监管' } },
      { path: 'sos', name: 'Sos', component: () => import('../views/sos/index.vue'), meta: { title: 'SOS 风险中心' } },
      { path: 'gps', name: 'Gps', component: () => import('../views/gps/index.vue'), meta: { title: '定位风险中心' } },
      { path: 'fall', name: 'Fall', component: () => import('../views/fall/index.vue'), meta: { title: '跌倒监测' } },
      { path: 'community', name: 'Community', component: () => import('../views/community/index.vue'), meta: { title: '社区管理' } },
      { path: 'timebank', name: 'Timebank', component: () => import('../views/timebank/index.vue'), meta: { title: '时间银行审核' } },
    ],
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

function decodeJwtPayload(token: string): { exp?: number } | null {
  const parts = token.split('.')
  if (parts.length < 2 || !parts[1]) return null

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    return JSON.parse(atob(padded)) as { exp?: number }
  } catch (_error: unknown) {
    return null
  }
}

router.beforeEach((to, _from, next) => {
  if (to.name === 'Login') {
    next()
    return
  }

  const token = getAdminToken()
  const refreshToken = getAdminRefreshToken()

  if (!token && !refreshToken) {
    next({ name: 'Login' })
    return
  }

  if (!token && refreshToken) {
    next()
    return
  }

  const payload = decodeJwtPayload(token)
  if (!payload) {
    if (refreshToken) {
      next()
      return
    }
    clearAdminSession()
    next({ name: 'Login' })
    return
  }

  if (payload.exp && payload.exp * 1000 < Date.now()) {
    if (refreshToken) {
      next()
      return
    }
    clearAdminSession()
    next({ name: 'Login' })
    return
  }

  next()
})

export default router