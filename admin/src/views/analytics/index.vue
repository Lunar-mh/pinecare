<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { useECharts } from '@/composables/useECharts'
import { getDashboardOverviewData, getRecentActivities } from '@/services'
import type { DashboardStats, ActivityItem } from '@/services'

const router = useRouter()
const loading = ref(false)
const stats = ref<DashboardStats['stats']>([])
const activities = ref<ActivityItem[]>([])

const pieChartRef = ref<HTMLElement | null>(null)
const barChartRef = ref<HTMLElement | null>(null)

// 采用组合式函数托管图表实例（内置 shallowRef、ResizeObserver 与自动生命周期释放，彻底杜绝内存泄漏）
const { setOption: setPieOption } = useECharts(pieChartRef)
const { setOption: setBarOption } = useECharts(barChartRef)

// Translations
const TYPE_MAP: Record<string, string> = {
  sos: 'SOS 应急呼叫', 
  fall: '跌倒事件监测', 
  medication: '用药状态监控', 
  gps: '安全区域定位同步'
}
const STATUS_MAP: Record<string, string> = {
  trigger: '触发处置中', 
  pending: '待响应处理', 
  resolved: '已处置闭环', 
  complete: '已完成跟进', 
  cancelled: '已安全撤销',
  confirm: '已指派确认', 
  resolve: '已处置闭环', 
  cancel: '已安全解除', 
  processing: '核实跟进中'
}
function formatType(t: string) { return TYPE_MAP[t] || t }
function formatStatus(s: string) { return STATUS_MAP[s] || s }

function formatUser(u: string) {
  if (!u) return '社区长者'
  const rules = [
    { regex: /^elder[_-]?(\d+)$/i, prefix: '长者' },
    { regex: /^family[_-]?(\d+)$/i, prefix: '家属' },
    { regex: /^volunteer[_-]?(\d+)$/i, prefix: '守护员' },
  ]
  for (const rule of rules) {
    const match = rule.regex.exec(u)
    if (match) return `${rule.prefix} ${match[1]} 号`
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
  // 1. 饼图：适老暖玉微晶环形图与大字提示
  setPieOption({
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/><strong>{b}</strong>: {c} 次 ({d}%)',
    },
    legend: {
      orient: 'horizontal',
      bottom: '2%',
      itemGap: 14,
      textStyle: { color: '#18221E', fontSize: 13, fontWeight: 500 },
    },
    series: [
      {
        name: '事件分类',
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#ffffff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c}',
          fontSize: 13,
          color: '#18221E',
          fontWeight: 600,
        },
        data: activityByType.value.length > 0 
          ? activityByType.value.map(item => ({ name: item.type, value: item.count }))
          : [{ name: '暂无事件', value: 0 }],
      },
    ],
  })

  // 2. 柱状图：适老翡翠松青微晶渐变、粗柱体与平滑轴标签
  setBarOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: '{b}<br/><span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:#1F6B56;"></span>触发频次: <strong>{c} 次</strong>',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '14%',
      top: '12%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: topUsers.value.map(item => item.user),
      axisLabel: {
        rotate: 25,
        color: '#485750',
        fontSize: 13,
        fontWeight: 600,
      },
      axisLine: { lineStyle: { color: 'rgba(210, 225, 218, 0.8)' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: 'rgba(227, 216, 200, 0.45)', type: 'dashed' } },
      axisLabel: { color: '#485750', fontSize: 13 },
    },
    series: [
      {
        name: '触发频次',
        type: 'bar',
        data: topUsers.value.map(item => item.count),
        barMaxWidth: 32,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#1F6B56' },
            { offset: 1, color: '#438470' },
          ]),
        },
      },
    ],
  })
}

async function fetchAnalyticsData() {
  loading.value = true
  try {
    const [overview, recent] = await Promise.all([getDashboardOverviewData(), getRecentActivities(50)])
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
  <div class="analytics-view">
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">全域照护趋势分析</span>
        <span class="wb-page-subtitle">关键指标历史波动、多维事件归因与系统重点态势分析</span>
      </div>
      <el-button type="primary" :icon="Refresh" :loading="loading" @click="fetchAnalyticsData">刷新数据</el-button>
    </div>

    <!-- 关键指标微晶卡片网格 -->
    <div class="wb-metric-grid">
      <div 
        v-for="item in stats" 
        :key="item.label" 
        class="wb-metric-card" 
        @click="handleCardClick(item)" 
        style="cursor: pointer;" 
        title="点击钻取详情"
      >
        <span class="wb-card-label">{{ item.label }}</span>
        <div class="wb-card-value">
          {{ item.value }}<small>{{ item.unit }}</small>
        </div>
        <span class="wb-card-hint">相较昨日波动平稳 · 处在安全区间</span>
      </div>
    </div>

    <!-- 双图表微晶联动面板 -->
    <div class="wb-grid-2">
      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 12px">
          <div>
            <span class="wb-page-title" style="font-size: 20px">事件类型分布</span>
            <span class="wb-page-subtitle">周期内各类照护与风险事件构成比</span>
          </div>
        </div>
        <div ref="pieChartRef" style="height: 320px; width: 100%;"></div>
      </div>

      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 12px">
          <div>
            <span class="wb-page-title" style="font-size: 20px">高频触发对象排行</span>
            <span class="wb-page-subtitle">事件触发频率最高的重点关注对象</span>
          </div>
        </div>
        <div ref="barChartRef" style="height: 320px; width: 100%;"></div>
      </div>
    </div>

    <!-- 最近事件追溯明细表 (微晶温润表格) -->
    <div class="wb-panel" style="margin-top: 22px">
      <div class="wb-page-header" style="margin-bottom: 16px">
        <div>
          <span class="wb-page-title" style="font-size: 20px">最近事件记录清单</span>
          <span class="wb-page-subtitle">全域传感器上报与系统下发的重点动态追溯</span>
        </div>
      </div>
      <el-table :data="activities" stripe v-loading="loading">
        <el-table-column prop="id" label="记录 ID" width="90" />
        <el-table-column label="事件类型" width="220">
          <template #default="{ row }">
            <span style="font-weight: 600;">{{ formatType(row.type) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="关注对象" width="160">
          <template #default="{ row }">
            <span>{{ formatUser(row.user) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="触发时间" min-width="180">
          <template #default="{ row }">
            <span>{{ formatTime(row.time) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="处置状态" width="140">
          <template #default="{ row }">
            <el-tag :type="['resolved', 'complete', '已解决', '已完成', '已处置闭环', '已安全解除'].includes(formatStatus(row.status)) ? 'success' : 'warning'">
              {{ formatStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.analytics-view {
  display: flex;
  flex-direction: column;
}
</style>
