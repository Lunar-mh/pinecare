<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getDashboardStats, getRecentActivities } from '@/services'
import type { DashboardStats, ActivityItem } from '@/services'

const loading = ref(false)
const stats = ref<DashboardStats['stats']>([])
const activities = ref<ActivityItem[]>([])

const activityByType = computed(() => {
  const map = new Map<string, number>()
  activities.value.forEach(item => map.set(item.type, (map.get(item.type) || 0) + 1))
  return Array.from(map.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
})

const topUsers = computed(() => {
  const map = new Map<string, number>()
  activities.value.forEach(item => map.set(item.user, (map.get(item.user) || 0) + 1))
  return Array.from(map.entries()).map(([user, count]) => ({ user, count })).sort((a, b) => b.count - a.count).slice(0, 8)
})

async function fetchAnalyticsData() {
  loading.value = true
  try {
    const [overview, recent] = await Promise.all([getDashboardStats(), getRecentActivities(50)])
    stats.value = overview.stats || []
    activities.value = recent || []
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '加载分析视图失败')
    stats.value = []
    activities.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchAnalyticsData)
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">趋势与活跃度</span>
        <span class="wb-page-subtitle">用轻量分析视图看清最近哪些业务最活跃、哪些用户最需要关注。</span>
      </div>
      <el-button :icon="Refresh" @click="fetchAnalyticsData">刷新</el-button>
    </div>

    <div class="wb-metric-grid">
      <div v-for="item in stats" :key="item.label" class="wb-metric-card">
        <span class="wb-card-label">{{ item.label }}</span>
        <div class="wb-card-value">{{ item.value }}<small>{{ item.unit }}</small></div>
        <span class="wb-card-hint">用于判断整体运行热度</span>
      </div>
    </div>

    <div class="wb-grid-2">
      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 14px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">活动类型分布</span>
            <span class="wb-page-subtitle">先看近期哪类业务最频繁。</span>
          </div>
        </div>
        <el-table :data="activityByType" stripe v-loading="loading">
          <el-table-column prop="type" label="类型" />
          <el-table-column prop="count" label="次数" width="120" />
        </el-table>
      </div>

      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 14px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">高活跃用户</span>
            <span class="wb-page-subtitle">把最近动作最多的用户放在上面。</span>
          </div>
        </div>
        <el-table :data="topUsers" stripe v-loading="loading">
          <el-table-column prop="user" label="用户" />
          <el-table-column prop="count" label="动作数" width="120" />
        </el-table>
      </div>
    </div>

    <div class="wb-panel" style="margin-top: 20px">
      <div class="wb-page-header" style="margin-bottom: 14px">
        <div>
          <span class="wb-page-title" style="font-size: 22px">最近活动明细</span>
          <span class="wb-page-subtitle">保留一张可追踪的底表，方便继续下钻。</span>
        </div>
      </div>
      <el-table :data="activities" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="type" label="类型" width="220" />
        <el-table-column prop="user" label="用户" width="140" />
        <el-table-column prop="time" label="时间" />
        <el-table-column prop="status" label="状态" width="120" />
      </el-table>
    </div>
  </div>
</template>
