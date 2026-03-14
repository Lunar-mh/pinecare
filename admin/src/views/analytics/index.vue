<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { getDashboardStats, getRecentActivities } from '@/services'
import type { DashboardStats, ActivityItem } from '@/services'

const router = useRouter()
const loading = ref(false)
const stats = ref<DashboardStats['stats']>([])
const activities = ref<ActivityItem[]>([])

const pieChartRef = ref<HTMLElement | null>(null)
const barChartRef = ref<HTMLElement | null>(null)

// Translations
const TYPE_MAP: Record<string, string> = {
  sos: 'SOS 测试告警', fall: '异常跌倒事件', medication: '用药状态监控', gps: '位置更新同步'
}
const STATUS_MAP: Record<string, string> = {
  trigger: '触发中', pending: '待处理', resolved: '已解决', complete: '已完成', cancelled: '已撤销',
  confirm: '已确认', resolve: '已解决', cancel: '已取消', processing: '排查中'
}
function formatType(t: string) { return TYPE_MAP[t] || t }
function formatStatus(s: string) { return STATUS_MAP[s] || s }

function formatUser(u: string) {
  if (!u) return '匿名用户'
  const rules = [
    { regex: /^elder[_-]?(\d+)$/i, prefix: '长辈' },
    { regex: /^family[_-]?(\d+)$/i, prefix: '家属' },
    { regex: /^volunteer[_-]?(\d+)$/i, prefix: '志愿者' },
  ]
  for (const rule of rules) {
    const match = rule.regex.exec(u)
    if (match) return `${rule.prefix} ${match[1]}号`
  }
  return u
}

const activityByType = computed(() => {
  const map = new Map<string, number>()
  activities.value.forEach(item => {
    const t = formatType(item.type)
    map.set(t, (map.get(t) || 0) + 1)
  })
  return Array.from(map.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
})

const topUsers = computed(() => {
  const map = new Map<string, number>()
  activities.value.forEach(item => {
    const u = formatUser(item.user)
    map.set(u, (map.get(u) || 0) + 1)
  })
  return Array.from(map.entries()).map(([user, count]) => ({ user, count })).sort((a, b) => b.count - a.count).slice(0, 8)
})

function renderCharts() {
  if (pieChartRef.value) {
    const pieChart = echarts.init(pieChartRef.value)
    pieChart.setOption({
      tooltip: { trigger: 'item' },
      series: [
        {
          name: '活动类型',
          type: 'pie',
          radius: ['40%', '70%'],
          data: activityByType.value.map(item => ({ name: item.type, value: item.count }))
        }
      ]
    })
  }

  if (barChartRef.value) {
    const barChart = echarts.init(barChartRef.value)
    barChart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: topUsers.value.map(item => item.user), axisLabel: { rotate: 45 } },
      yAxis: { type: 'value' },
      series: [{ data: topUsers.value.map(item => item.count), type: 'bar', itemStyle: { color: '#409EFF' } }]
    })
  }
}

async function fetchAnalyticsData() {
  loading.value = true
  try {
    const [overview, recent] = await Promise.all([getDashboardStats(), getRecentActivities(50)])
    stats.value = overview.stats || []
    activities.value = recent || []
    await nextTick()
    renderCharts()
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '加载图表数据失败')
    stats.value = []
    activities.value = []
  } finally {
    loading.value = false
  }
}

function handleCardClick(item: any) {
  if (item.label.includes('工单') || item.label.includes('SOS')) {
    router.push('/sos')
  } else if (item.label.includes('用户')) {
    router.push('/users')
  } else if (item.label.includes('健康')) {
    router.push('/health')
  }
}

function formatTime(val: string) {
  if (!val) return ''
  const d = new Date(val);
  if (Number.isNaN(d.getTime()) || d.getFullYear() <= 1970) return '暂无数据'
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(fetchAnalyticsData)
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">趋势分析</span>
        <span class="wb-page-subtitle">关键指标变化与全域系统运行态势预览</span>
      </div>
      <el-button :icon="Refresh" @click="fetchAnalyticsData">刷新数据</el-button>
    </div>

    <div class="wb-metric-grid">
      <div v-for="item in stats" :key="item.label" class="wb-metric-card" @click="handleCardClick(item)" style="cursor: pointer;" title="点击查看详情">
        <span class="wb-card-label">{{ item.label }}</span>
        <div class="wb-card-value">{{ item.value }}<small>{{ item.unit }}</small></div>
        <span class="wb-card-hint">相较昨日波动平稳</span>
      </div>
    </div>

    <div class="wb-grid-2">
      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 14px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">活动类型分布</span>
            <span class="wb-page-subtitle">本周平台产生的事件类别占比</span>
          </div>
        </div>
        <div ref="pieChartRef" style="height: 300px;"></div>
      </div>

      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 14px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">高频触发用户</span>
            <span class="wb-page-subtitle">事件触发频率最高的监控对象</span>
          </div>
        </div>
        <div ref="barChartRef" style="height: 300px;"></div>
      </div>
    </div>

    <div class="wb-panel" style="margin-top: 20px">
      <div class="wb-page-header" style="margin-bottom: 14px">
        <div>
          <span class="wb-page-title" style="font-size: 22px">最近事件记录</span>
          <span class="wb-page-subtitle">系统拦截或下发的重点动态追溯</span>
        </div>
      </div>
      <el-table :data="activities" stripe v-loading="loading">
        <el-table-column prop="id" label="记录 ID" width="80" />
        <el-table-column label="事件类型" width="220">
          <template #default="{ row }">{{ formatType(row.type) }}</template>
        </el-table-column>
        <el-table-column label="操作对象" width="140">
          <template #default="{ row }">{{ formatUser(row.user) }}</template>
        </el-table-column>
        <el-table-column label="触发时间">
          <template #default="{ row }">{{ formatTime(row.time) }}</template>
        </el-table-column>
        <el-table-column label="当前状态" width="120">
          <template #default="{ row }">
            <el-tag :type="['resolved', 'complete', '已解决', '已完成'].includes(formatStatus(row.status)) ? 'success' : 'warning'">
              {{ formatStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
