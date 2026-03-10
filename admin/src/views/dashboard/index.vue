<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { User, Timer, TrendCharts, Odometer } from '@element-plus/icons-vue'
import { getDashboardStats, getRecentActivities } from '@/services'
import type { StatItem, ActivityItem } from '@/services'

const defaultStats: StatItem[] = [
  { label: 'Active Users', value: '--', unit: '', color: '#01579b', bg: '#e3f2fd', trend: '' },
  { label: 'Today Records', value: '--', unit: '', color: '#2e7d32', bg: '#e8f5e9', trend: '' },
  { label: 'Pending Orders', value: '--', unit: '', color: '#e65100', bg: '#fff3e0', trend: '' },
  { label: 'Active SOS', value: '--', unit: '', color: '#6a1b9a', bg: '#f3e5f5', trend: '' },
]

const stats = ref<StatItem[]>(defaultStats)
const recentActivities = ref<ActivityItem[]>([])
const loading = ref(true)
const statIcons = [User, Odometer, TrendCharts, Timer]

function statusTagType(status: string): string {
  const map: Record<string, string> = {
    正常: 'success',
    已处理: 'info',
    待审核: 'warning',
    已完成: 'success',
    完成: 'success',
  }
  return map[status] || 'info'
}

onMounted(async () => {
  loading.value = true
  try {
    const [dashData, activities] = await Promise.all([
      getDashboardStats(),
      getRecentActivities(10),
    ])

    stats.value = dashData.stats?.length ? dashData.stats : defaultStats
    recentActivities.value = activities || []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="dashboard-page">
    <div class="page-title">Dashboard</div>

    <el-row :gutter="16" class="stats-row">
      <el-col v-for="(stat, idx) in stats" :key="stat.label" :span="6">
        <div class="stat-card">
          <div class="stat-icon" :style="{ background: stat.bg }">
            <el-icon :size="28" :color="stat.color">
              <component :is="statIcons[idx]" />
            </el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">
              <span v-if="loading" class="loading-placeholder">--</span>
              <template v-else>{{ stat.value }}</template>
              <span class="stat-unit">{{ stat.unit }}</span>
            </div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
          <div v-if="stat.trend" class="stat-trend" style="color: #2e7d32">{{ stat.trend }}</div>
        </div>
      </el-col>
    </el-row>

    <el-card class="activity-card">
      <template #header>
        <span class="card-title">Recent Activities</span>
      </template>
      <el-table :data="recentActivities" stripe style="width: 100%" v-loading="loading">
        <template #empty>
          <div style="padding: 24px; text-align: center; color: #999">
            {{ loading ? 'Loading...' : 'No data' }}
          </div>
        </template>
        <el-table-column prop="type" label="Type" width="180" />
        <el-table-column prop="user" label="User" width="140" />
        <el-table-column prop="time" label="Time" />
        <el-table-column label="Status" width="120">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.dashboard-page { max-width: 1200px; }
.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 20px;
}
.stats-row { margin-bottom: 20px; }
.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-info { flex: 1; }
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
}
.loading-placeholder { color: #ccc; }
.stat-unit {
  font-size: 14px;
  font-weight: 400;
  color: #666;
  margin-left: 2px;
}
.stat-label {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}
.stat-trend {
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}
.activity-card { border-radius: 8px; }
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}
</style>
