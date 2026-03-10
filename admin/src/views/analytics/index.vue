<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getDashboardStats, getRecentActivities } from '@/services'
import type { DashboardStats, ActivityItem } from '@/services'

const loading = ref(false)
const stats = ref<DashboardStats['stats']>([])
const activities = ref<ActivityItem[]>([])

const activityByType = computed(() => {
  const map = new Map<string, number>()
  for (const item of activities.value) {
    map.set(item.type, (map.get(item.type) || 0) + 1)
  }
  return Array.from(map.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
})

const topUsers = computed(() => {
  const map = new Map<string, number>()
  for (const item of activities.value) {
    map.set(item.user, (map.get(item.user) || 0) + 1)
  }
  return Array.from(map.entries())
    .map(([user, count]) => ({ user, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
})

async function fetchAnalyticsData() {
  loading.value = true
  try {
    const [overview, recent] = await Promise.all([getDashboardStats(), getRecentActivities(50)])
    stats.value = overview.stats || []
    activities.value = recent || []
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load analytics data.'
    ElMessage.error(message)
    stats.value = []
    activities.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchAnalyticsData)
</script>

<template>
  <div class="analytics-page">
    <div class="page-header">
      <span class="page-title">Analytics (Live)</span>
      <el-button :icon="Refresh" @click="fetchAnalyticsData">Refresh</el-button>
    </div>

    <el-row :gutter="16" class="overview-row">
      <el-col v-for="item in stats" :key="item.label" :span="6">
        <div class="stat-card">
          <div class="stat-label">{{ item.label }}</div>
          <div class="stat-value">{{ item.value }}<span class="stat-unit">{{ item.unit }}</span></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card class="table-card">
          <template #header>
            <span>Activity Type Distribution</span>
          </template>
          <el-table :data="activityByType" stripe style="width: 100%" v-loading="loading">
            <el-table-column prop="type" label="Type" min-width="180" />
            <el-table-column prop="count" label="Count" width="120" />
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="table-card">
          <template #header>
            <span>Top Active Users</span>
          </template>
          <el-table :data="topUsers" stripe style="width: 100%" v-loading="loading">
            <el-table-column prop="user" label="User" min-width="180" />
            <el-table-column prop="count" label="Actions" width="120" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="table-card" style="margin-top: 16px">
      <template #header>
        <span>Recent Activities</span>
      </template>
      <el-table :data="activities" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="type" label="Type" width="220" />
        <el-table-column prop="user" label="User" width="140" />
        <el-table-column prop="time" label="Time" min-width="180" />
        <el-table-column prop="status" label="Status" width="120" />
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.analytics-page { max-width: 1200px; }
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.overview-row { margin-bottom: 16px; }
.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.stat-label { font-size: 13px; color: #888; margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 700; color: #1a1a1a; line-height: 1.2; }
.stat-unit { font-size: 14px; font-weight: 400; color: #666; margin-left: 4px; }
.table-card { border-radius: 8px; }
</style>
