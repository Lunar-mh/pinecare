<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Odometer,
  User,
  DataAnalysis,
  OfficeBuilding,
  ArrowLeft,
  ArrowRight,
  SwitchButton,
  UserFilled,
  FirstAidKit,
  Memo,
  Warning,
  House,
  Bell,
  MagicStick,
  Timer,
  Location,
  Management,
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const collapsed = ref(false)

const menuItems = [
  { index: '/dashboard', label: '数据概览', icon: Odometer },
  { index: '/analytics', label: '数据分析', icon: DataAnalysis },
  { index: '/users', label: '用户管理', icon: User },
  { index: '/health', label: '健康档案', icon: FirstAidKit },
  { index: '/medication', label: '用药提醒', icon: Memo },
  { index: '/sos', label: 'SOS管理', icon: Warning },
  { index: '/family', label: '家属管理', icon: House },
  { index: '/fall', label: '跌倒记录', icon: Bell },
  { index: '/drug', label: '药物相互作用', icon: MagicStick },
  { index: '/timebank', label: '时间银行', icon: Timer },
  { index: '/gps', label: 'GPS追踪', icon: Location },
  { index: '/medical', label: '医疗资源', icon: Management },
  { index: '/volunteers', label: '志愿者管理', icon: UserFilled },
  { index: '/community', label: '社区管理', icon: OfficeBuilding },
]

const currentPath = computed(() => route.path)

function handleLogout() {
  localStorage.removeItem('admin_token')
  router.push('/login')
}
</script>

<template>
  <el-container class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="collapsed ? '64px' : '220px'" class="admin-aside">
      <div class="aside-logo">
        <span v-if="!collapsed" class="logo-text">银伴管理后台</span>
        <span v-else class="logo-icon">银</span>
      </div>
      <el-menu
        :default-active="currentPath"
        :collapse="collapsed"
        :router="true"
        background-color="#001529"
        text-color="rgba(255,255,255,0.75)"
        active-text-color="#ffffff"
        class="aside-menu"
      >
        <el-menu-item
          v-for="item in menuItems"
          :key="item.index"
          :index="item.index"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </el-menu>
      <div class="aside-collapse-btn" @click="collapsed = !collapsed">
        <el-icon>
          <component :is="collapsed ? ArrowRight : ArrowLeft" />
        </el-icon>
      </div>
    </el-aside>

    <!-- 主内容区 -->
    <el-container class="admin-main-container">
      <!-- 顶栏 -->
      <el-header class="admin-header">
        <div class="header-breadcrumb">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-actions">
          <el-dropdown @command="handleLogout">
            <span class="header-user">
              <el-avatar :size="32" style="background:#01579b">管</el-avatar>
              <span class="header-username">管理员</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :icon="SwitchButton" command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 页面内容 -->
      <el-main class="admin-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.admin-layout {
  height: 100vh;
}

.admin-aside {
  background: #001529;
  transition: width 0.25s;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.aside-logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.logo-text {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: 1px;
}

.logo-icon {
  color: #fff;
  font-size: 22px;
  font-weight: 700;
}

.aside-menu {
  flex: 1;
  border-right: none;
  overflow-y: auto;
}

.aside-menu:not(.el-menu--collapse) {
  width: 220px;
}

.aside-collapse-btn {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  transition: color 0.2s;
}

.aside-collapse-btn:hover {
  color: #fff;
}

.admin-header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.header-user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  outline: none;
}

.header-username {
  font-size: 14px;
  color: #333;
}

.admin-main-container {
  background: #f0f2f5;
  overflow: hidden;
}

.admin-main {
  padding: 24px;
  overflow-y: auto;
}
</style>
