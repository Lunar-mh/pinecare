import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

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
      { path: 'drug', name: 'Drug', component: () => import('../views/drug/index.vue'), meta: { title: '药物风险' } },
      { path: 'medical', name: 'Medical', component: () => import('../views/medical/index.vue'), meta: { title: '医疗资源网络' } },
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

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('admin_token')
  if (to.name !== 'Login' && !token) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

export default router