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

function renderCharts() {
  if (pieChartRef.value) {
    const pieChart = echarts.init(pieChartRef.value)
    pieChart.setOption({
      tooltip: { trigger: 'item' },
      series: [
        {
          name: '�����',
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
    ElMessage.error(err instanceof Error ? err.message : '���ط�����ͼʧ��')
    stats.value = []
    activities.value = []
  } finally {
    loading.value = false
  }
}

function handleCardClick(item: any) {
  if (item.label.includes('����') || item.label.includes('SOS')) {
    router.push('/sos')
  } else if (item.label.includes('�û�')) {
    router.push('/users')
  } else if (item.label.includes('����')) {
    router.push('/health')
  }
}

function formatTime(val: string) {
  if (!val) return ''
  const d = new Date(val);
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(fetchAnalyticsData)
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">�������Ծ��</span>
        <span class="wb-page-subtitle">������������ͼ���������Щҵ�����Ծ����Щ�û�����Ҫ��ע��</span>
      </div>
      <el-button :icon="Refresh" @click="fetchAnalyticsData">ˢ��</el-button>
    </div>

    <div class="wb-metric-grid">
      <div v-for="item in stats" :key="item.label" class="wb-metric-card" @click="handleCardClick(item)" style="cursor: pointer;" title="����鿴����">
        <span class="wb-card-label">{{ item.label }}</span>
        <div class="wb-card-value">{{ item.value }}<small>{{ item.unit }}</small></div>
        <span class="wb-card-hint">�����ж����������ȶ�</span>
      </div>
    </div>

    <div class="wb-grid-2">
      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 14px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">����ͷֲ�</span>
            <span class="wb-page-subtitle">�ȿ���������ҵ����Ƶ����</span>
          </div>
        </div>
        <div ref="pieChartRef" style="height: 300px;"></div>
      </div>

      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 14px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">�߻�Ծ�û�</span>
            <span class="wb-page-subtitle">��������������û��������档</span>
          </div>
        </div>
        <div ref="barChartRef" style="height: 300px;"></div>
      </div>
    </div>

    <div class="wb-panel" style="margin-top: 20px">
      <div class="wb-page-header" style="margin-bottom: 14px">
        <div>
          <span class="wb-page-title" style="font-size: 22px">������ϸ</span>
          <span class="wb-page-subtitle">����һ�ſ�׷�ٵĵױ�������������ꡣ</span>
        </div>
      </div>
      <el-table :data="activities" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="type" label="����" width="220" />
        <el-table-column prop="user" label="�û�" width="140" />
        <el-table-column label="ʱ��">
          <template #default="{ row }">{{ formatTime(row.time) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="״̬" width="120" />
      </el-table>
    </div>
  </div>
</template>
