<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Bell, Search, SwitchButton } from '@element-plus/icons-vue'
import { workbenchNavGroups, findWorkbenchItem } from '@/design/navigation'
import { resolveWorkbenchRole } from '@/view-models/workbenchRoles'
import { clearAdminSession } from '@/services/session'

const router = useRouter()
const route = useRoute()

const collapsed = ref(false)
const searchText = ref('')
const notificationCount = ref(3)
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
</script>

<template>
  <el-container class="workbench-layout">
    <el-aside :width="collapsed ? '88px' : '288px'" class="workbench-layout__aside">
      <div class="brand-card">
        <div class="brand-card__mark">银</div>
        <div v-if="!collapsed" class="brand-card__copy">
          <span class="brand-card__title">银伴社区工作台</span>
          <span class="brand-card__subtitle">社区管理、风险响应与资源协调中心</span>
        </div>
      </div>

      <div v-if="!collapsed" class="aside-search">
        <el-input v-model="searchText" :prefix-icon="Search" placeholder="搜索页面或功能" clearable @keyup.enter="handleSearch" />
      </div>

      <div class="aside-nav">
        <div v-for="group in filteredGroups" :key="group.key" class="aside-group">
          <div v-if="!collapsed" class="aside-group__title">{{ group.label }}</div>
          <div v-for="item in group.items" :key="item.index" :class="['aside-link', route.path === item.index ? 'aside-link--active' : '']" @click="handleNavigate(item.index)">
            <div class="aside-link__icon"><el-icon><component :is="item.icon" /></el-icon></div>
            <div v-if="!collapsed" class="aside-link__body">
              <span class="aside-link__label">{{ item.label }}</span>
              <span class="aside-link__subtitle">{{ item.subtitle }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="aside-footer" @click="collapsed = !collapsed">
        <span>{{ collapsed ? '展开导航' : '收起导航' }}</span>
      </div>
    </el-aside>

    <el-container>
      <el-header class="workbench-layout__header">
        <div>
          <div class="workbench-layout__eyebrow">{{ currentItem?.subtitle || roleProfile.subtitle }}</div>
          <div class="workbench-layout__title">{{ currentItem?.label || '社区管理工作台' }}</div>
        </div>
        <div class="header-actions">
          <div class="wb-chip">
            <el-icon><Bell /></el-icon>
            <span>待处理 {{ notificationCount }}</span>
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
}

.workbench-layout__aside {
  background: rgba(255, 253, 250, 0.9);
  border-right: 1px solid rgba(227, 216, 200, 0.9);
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(12px);
}

.brand-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 20px 18px;
}

.brand-card__mark {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--wb-primary), #438470);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 20px;
}

.brand-card__copy {
  display: flex;
  flex-direction: column;
}

.brand-card__title,
.brand-card__subtitle {
  display: block;
}

.brand-card__title {
  font-size: 18px;
  font-weight: 700;
  color: var(--wb-text);
}

.brand-card__subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--wb-text-soft);
}

.aside-search {
  padding: 0 20px 14px;
}

.aside-nav {
  flex: 1;
  overflow-y: auto;
  padding: 0 14px 18px;
}

.aside-group {
  margin-bottom: 16px;
}

.aside-group__title {
  padding: 10px 10px 8px;
  font-size: 12px;
  color: var(--wb-text-soft);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.aside-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 10px;
  border-radius: 16px;
  cursor: pointer;
}

.aside-link--active {
  background: linear-gradient(135deg, rgba(47, 108, 91, 0.12), rgba(47, 108, 91, 0.05));
}

.aside-link__icon {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  background: rgba(47, 108, 91, 0.1);
  color: var(--wb-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.aside-link__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.aside-link__label,
.aside-link__subtitle {
  display: block;
}

.aside-link__label {
  font-size: 15px;
  color: var(--wb-text);
  font-weight: 700;
}

.aside-link__subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--wb-text-soft);
}

.aside-footer {
  padding: 16px 20px 20px;
  border-top: 1px solid rgba(227, 216, 200, 0.9);
  color: var(--wb-text-soft);
  font-size: 13px;
  cursor: pointer;
}

.workbench-layout__header {
  height: 84px;
  background: rgba(255, 253, 250, 0.72);
  border-bottom: 1px solid rgba(227, 216, 200, 0.9);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
}

.workbench-layout__eyebrow,
.workbench-layout__title {
  display: block;
}

.workbench-layout__eyebrow {
  font-size: 13px;
  color: var(--wb-text-soft);
}

.workbench-layout__title {
  margin-top: 6px;
  font-size: 24px;
  font-weight: 700;
  color: var(--wb-text);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  cursor: pointer;
}

.header-user__avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--wb-secondary), #db916c);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.header-user__meta {
  display: flex;
  flex-direction: column;
}

.header-user__name,
.header-user__role {
  display: block;
}

.header-user__name {
  font-size: 14px;
  color: var(--wb-text);
  font-weight: 700;
}

.header-user__role {
  margin-top: 2px;
  font-size: 12px;
  color: var(--wb-text-soft);
}

.workbench-layout__main {
  padding: 24px 28px 28px;
  overflow-y: auto;
}
</style>