<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Bell, Search, SwitchButton, Fold, Expand } from '@element-plus/icons-vue'
import { workbenchNavGroups, findWorkbenchItem } from '@/design/navigation'
import { resolveWorkbenchRole } from '@/view-models/workbenchRoles'
import { clearAdminSession } from '@/services/session'
import { getDashboardStats } from '@/services'

const router = useRouter()
const route = useRoute()

const collapsed = ref(false)
const searchText = ref('')
const notificationCount = ref(0)
const roleProfile = computed(() => resolveWorkbenchRole(localStorage.getItem('community_role')))
const currentItem = computed(() => findWorkbenchItem(route.path))

const filteredGroups = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  if (!keyword) return workbenchNavGroups
  return workbenchNavGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => `${item.label}${item.subtitle}`.toLowerCase().includes(keyword)),
    }))
    .filter(group => group.items.length > 0)
})

function handleNavigate(path: string) {
  router.push(path)
}

function handleSearch() {
  const target = filteredGroups.value.flatMap(group => group.items)[0]
  if (target) {
    router.push(target.index)
  }
}

function handleLogout() {
  clearAdminSession()
  router.push('/login')
}

async function fetchNotificationCount() {
  try {
    const stats = await getDashboardStats()
    if (stats && typeof stats.pendingAlerts === 'number') {
      notificationCount.value = stats.pendingAlerts
    }
  } catch (_e) {
    // 降级保持 0
    notificationCount.value = 0
  }
}

onMounted(() => {
  fetchNotificationCount()
})
</script>

<template>
  <el-container class="workbench-layout">
    <!-- 侧边栏：玉白微晶浮雕质感 -->
    <el-aside :width="collapsed ? '88px' : '288px'" class="workbench-layout__aside">
      <div class="brand-card">
        <div class="brand-card__mark">
          <span>银</span>
        </div>
        <div v-if="!collapsed" class="brand-card__copy">
          <span class="brand-card__title">银伴社区工作台</span>
          <span class="brand-card__subtitle">社区管理·风险响应·适老照护</span>
        </div>
      </div>

      <div v-if="!collapsed" class="aside-search">
        <el-input 
          v-model="searchText" 
          :prefix-icon="Search" 
          placeholder="搜索页面或功能" 
          clearable 
          @keyup.enter="handleSearch" 
        />
      </div>

      <div class="aside-nav">
        <div v-for="group in filteredGroups" :key="group.key" class="aside-group">
          <div v-if="!collapsed" class="aside-group__title">{{ group.label }}</div>
          <div 
            v-for="item in group.items" 
            :key="item.index" 
            :class="['aside-link', route.path === item.index ? 'aside-link--active' : '']" 
            @click="handleNavigate(item.index)"
          >
            <div class="aside-link__icon">
              <el-icon><component :is="item.icon" /></el-icon>
            </div>
            <div v-if="!collapsed" class="aside-link__body">
              <span class="aside-link__label">{{ item.label }}</span>
              <span class="aside-link__subtitle">{{ item.subtitle }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="aside-footer" @click="collapsed = !collapsed" :title="collapsed ? '展开导航' : '收起导航'">
        <el-icon><component :is="collapsed ? Expand : Fold" /></el-icon>
        <span v-if="!collapsed">{{ '收起侧边栏' }}</span>
      </div>
    </el-aside>

    <el-container class="workbench-layout__content">
      <!-- 顶栏：微晶通透浮雕导航 -->
      <el-header class="workbench-layout__header">
        <div class="header-left">
          <div class="workbench-layout__eyebrow">{{ currentItem?.subtitle || roleProfile.subtitle }}</div>
          <div class="workbench-layout__title">{{ currentItem?.label || '社区管理工作台' }}</div>
        </div>
        <div class="header-actions">
          <div 
            class="wb-chip header-chip" 
            @click="router.push('/sos')" 
            style="cursor: pointer;" 
            :title="notificationCount > 0 ? `有 ${notificationCount} 条待处理事项` : '暂无待处理事项'"
          >
            <el-icon :class="{ 'has-alerts': notificationCount > 0 }"><Bell /></el-icon>
            <span>待处理 <strong class="badge-count">{{ notificationCount }}</strong></span>
          </div>
          <el-dropdown @command="handleLogout">
            <div class="header-user">
              <div class="header-user__avatar">管</div>
              <div class="header-user__meta">
                <span class="header-user__name">{{ roleProfile.label }}</span>
                <span class="header-user__role">{{ roleProfile.shiftHint }}</span>
              </div>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :icon="SwitchButton" command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="workbench-layout__main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.workbench-layout {
  min-height: 100vh;
  background: var(--wb-bg);
}

.workbench-layout__content {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 侧边栏：玉白微晶浮雕质感 */
.workbench-layout__aside {
  background: rgba(255, 253, 250, 0.88);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-right: 1px solid rgba(210, 225, 218, 0.6);
  box-shadow: 4px 0 24px rgba(31, 55, 45, 0.04);
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 20;
}

.brand-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 20px 20px;
}

.brand-card__mark {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, #1F6B56, #2E8B6E);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 22px;
  box-shadow: inset 0 1.5px 1.5px rgba(255, 255, 255, 0.8),
              0 4px 14px rgba(31, 107, 86, 0.28);
  flex-shrink: 0;
}

.brand-card__copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.brand-card__title,
.brand-card__subtitle {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-card__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--wb-text);
  letter-spacing: -0.01em;
}

.brand-card__subtitle {
  margin-top: 3px;
  font-size: 14px;
  color: var(--wb-text-soft);
}

.aside-search {
  padding: 0 16px 16px;
}

.aside-nav {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px 18px;
}

.aside-group {
  margin-bottom: 18px;
}

.aside-group__title {
  padding: 8px 12px 6px;
  font-size: 14px;
  color: #5C6E66;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.aside-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  cursor: pointer;
  margin-bottom: 4px;
  border: 1px solid transparent;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.aside-link:hover {
  background: rgba(31, 107, 86, 0.05);
}

.aside-link--active {
  background: rgba(31, 107, 86, 0.08);
  border: 1px solid rgba(31, 107, 86, 0.16);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.8),
              0 2px 8px rgba(31, 55, 45, 0.04);
}

.aside-link__icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgba(31, 107, 86, 0.08);
  color: var(--wb-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.aside-link--active .aside-link__icon {
  background: linear-gradient(135deg, #1F6B56, #2E8B6E);
  color: #ffffff;
  box-shadow: 0 3px 8px rgba(31, 107, 86, 0.25);
}

.aside-link__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.aside-link__label,
.aside-link__subtitle {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.aside-link__label {
  font-size: 15px;
  color: var(--wb-text);
  font-weight: 600;
}

.aside-link--active .aside-link__label {
  color: var(--wb-primary);
  font-weight: 700;
}

.aside-link__subtitle {
  margin-top: 3px;
  font-size: 14px;
  color: var(--wb-text-soft);
}

.aside-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(210, 225, 218, 0.6);
  color: var(--wb-text-soft);
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.aside-footer:hover {
  background: rgba(31, 107, 86, 0.04);
  color: var(--wb-primary);
}

/* 顶栏：微晶通透浮雕导航 */
.workbench-layout__header {
  height: 84px;
  background: rgba(255, 253, 250, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(210, 225, 218, 0.6);
  box-shadow: 0 4px 20px rgba(31, 55, 45, 0.03);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  flex-direction: column;
}

.workbench-layout__eyebrow {
  font-size: 14px;
  color: var(--wb-text-soft);
}

.workbench-layout__title {
  margin-top: 4px;
  font-size: 22px;
  font-weight: 700;
  color: var(--wb-text);
  letter-spacing: -0.01em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-chip {
  padding: 8px 18px;
}

.has-alerts {
  color: var(--wb-danger);
  animation: pulse-ring 2s infinite;
}

.badge-count {
  font-weight: 700;
  margin-left: 2px;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 14px 6px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(210, 225, 218, 0.7);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.9),
              0 2px 8px rgba(31, 55, 45, 0.04);
  cursor: pointer;
  transition: all 0.2s ease;
}

.header-user:hover {
  background: #ffffff;
  border-color: var(--wb-primary);
}

.header-user__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #C86D3B, #E0824E);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
  box-shadow: 0 2px 8px rgba(200, 109, 59, 0.25);
}

.header-user__meta {
  display: flex;
  flex-direction: column;
}

.header-user__name {
  font-size: 14px;
  color: var(--wb-text);
  font-weight: 700;
  line-height: 1.2;
}

.header-user__role {
  margin-top: 2px;
  font-size: 14px;
  color: var(--wb-text-soft);
  line-height: 1.2;
}

.workbench-layout__main {
  flex: 1;
  padding: 24px 28px 36px;
  overflow-y: auto;
}

@keyframes pulse-ring {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
</style>