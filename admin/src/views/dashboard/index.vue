<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getDashboardStats, getRecentActivities } from '@/services'
import type { DashboardStats } from '@/services/dashboard'
import { buildRiskItems, buildWorkbenchCards } from '@/view-models/workbench'

const dashboard = ref<DashboardStats>({ stats: [], recentActivities: [] })
const loading = ref(true)

const cards = computed(() => buildWorkbenchCards(dashboard.value.stats || []))
const risks = computed(() => buildRiskItems(dashboard.value.recentActivities || []))
const recentActivities = computed(() => dashboard.value.recentActivities || [])

function statusTagType(status: string): string {
  if (status.includes('正常') || status.includes('完成')) return 'success'
  if (status.includes('待') || status.includes('审核')) return 'warning'
  if (status.includes('SOS') || status.includes('异常')) return 'danger'
  return 'info'
}

onMounted(async () => {
  loading.value = true
  try {
    const [stats, activities] = await Promise.all([
      getDashboardStats(),
      getRecentActivities(8),
    ])
    dashboard.value = {
      stats: stats.stats || [],
      recentActivities: activities || [],
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">今日态势总览</span>
        <span class="wb-page-subtitle">先看活跃、告警、待处理，再进入各业务页做细分操作。</span>
      </div>
      <div class="wb-chip">值班建议：先处理 SOS 与离线异常</div>
    </div>

    <div class="wb-metric-grid">
      <div v-for="card in cards" :key="card.label" class="wb-metric-card">
        <span class="wb-card-label">{{ card.label }}</span>
        <div class="wb-card-value">{{ card.value }}<small>{{ card.unit }}</small></div>
        <span class="wb-card-hint">{{ card.hint }}</span>
      </div>
    </div>

    <div class="wb-grid-2">
      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 14px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">高风险事项</span>
            <span class="wb-page-subtitle">把最需要先处理的事项放在最上方。</span>
          </div>
        </div>
        <div class="wb-list">
          <div v-for="item in risks" :key="item.title + item.description" class="wb-list-item">
            <div>
              <span class="wb-list-title">{{ item.title }}</span>
              <span class="wb-list-desc">{{ item.description }}</span>
            </div>
            <el-tag :type="item.level === '高优先' ? 'danger' : item.level === '跟进中' ? 'warning' : 'success'">{{ item.level }}</el-tag>
          </div>
        </div>
      </div>

      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 14px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">待处理提醒</span>
            <span class="wb-page-subtitle">结合近期动态，快速判断下一步工作。</span>
          </div>
        </div>
        <div class="wb-list">
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">SOS 与位置异常</span>
              <span class="wb-list-desc">优先确认高风险事件是否已被接单和跟进。</span>
            </div>
            <el-tag type="danger">优先</el-tag>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">长辈离线与弱网</span>
              <span class="wb-list-desc">检查位置共享、设备在线状态和告警是否重复触发。</span>
            </div>
            <el-tag type="warning">关注</el-tag>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">志愿者调度</span>
              <span class="wb-list-desc">核对志愿者班次、服务时长和工单饱和度。</span>
            </div>
            <el-tag type="success">平稳</el-tag>
          </div>
        </div>
      </div>
    </div>

    <div class="wb-panel" style="margin-top: 20px">
      <div class="wb-page-header" style="margin-bottom: 14px">
        <div>
          <span class="wb-page-title" style="font-size: 22px">近期动态</span>
          <span class="wb-page-subtitle">保留表格视图，便于继续下钻处理。</span>
        </div>
      </div>
      <el-table :data="recentActivities" stripe v-loading="loading">
        <template #empty>
          <div style="padding: 28px; text-align: center; color: var(--wb-text-soft)">
            {{ loading ? '加载中...' : '暂无近期动态' }}
          </div>
        </template>
        <el-table-column prop="type" label="事件类型" width="200" />
        <el-table-column prop="user" label="相关用户" width="160" />
        <el-table-column prop="time" label="时间" />
        <el-table-column label="状态" width="140">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

