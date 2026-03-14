<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getFallHistory, getFallSettings, updateFallSettings } from '@/services'
import { usePagination } from '@/composables/usePagination'
import { formatTime, formatUser } from '@/utils/format'
import type { FallEventItem, FallEventStatus } from '@/services'

const settingsSaving = ref(false)
const statusFilter = ref<FallEventStatus | ''>('')
const sensitivity = ref<'high' | 'medium' | 'low'>('medium')

const {
  page,
  pageSize,
  total,
  list: events,
  loading,
  loadData,
} = usePagination<FallEventItem>(getFallHistory, 10)

const detectingCount = computed(() => events.value.filter(item => item.status === 'detecting').length)
const confirmedCount = computed(() => events.value.filter(item => item.status === 'confirmed').length)
const falseAlarmCount = computed(() => events.value.filter(item => item.status === 'false_alarm').length)

function statusLabel(status: FallEventStatus): string {
  if (status === 'detecting') return '监测中'
  if (status === 'confirmed') return '已确认'
  if (status === 'cancelled') return '已取消'
  return '误报'
}

function statusTagType(status: FallEventStatus): 'warning' | 'success' | 'info' {
  if (status === 'detecting') return 'warning'
  if (status === 'confirmed') return 'success'
  return 'info'
}

function sensitivityLabel(level: 'high' | 'medium' | 'low'): string {
  if (level === 'high') return '高灵敏'
  if (level === 'low') return '低灵敏'
  return '标准'
}

function readMetric(sensorData: Record<string, unknown> | null, key: string): string {
  if (!sensorData) return '-'
  const value = sensorData[key]
  if (typeof value === 'number' || typeof value === 'string') return String(value)
  return '-'
}

async function fetchHistory() {
  try {
    await loadData({ status: statusFilter.value || undefined })
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '跌倒事件加载失败')
  }
}

async function fetchSettings() {
  try {
    const data = await getFallSettings()
    sensitivity.value = data.sensitivity
  } catch {
    // ignore
  }
}

async function saveSettings() {
  settingsSaving.value = true
  try {
    const data = await updateFallSettings(sensitivity.value)
    sensitivity.value = data.sensitivity
    ElMessage.success('灵敏度策略已更新')
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '灵敏度更新失败')
  } finally {
    settingsSaving.value = false
  }
}

watch(statusFilter, () => {
  page.value = 1
  fetchHistory()
})

onMounted(async () => {
  await Promise.all([fetchHistory(), fetchSettings()])
})
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">跌倒监测</span>
        <span class="wb-page-subtitle">把监测事件、传感指标和灵敏度策略放在同一页，便于快速判断误报与真实风险。</span>
      </div>
      <el-button :icon="Refresh" @click="fetchHistory">刷新事件</el-button>
    </div>

    <div class="wb-metric-grid">
      <div class="wb-metric-card">
        <span class="wb-card-label">当前页事件</span>
        <div class="wb-card-value">{{ events.length }}</div>
        <span class="wb-card-hint">当前筛选条件与页码下的结果</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">监测中</span>
        <div class="wb-card-value">{{ detectingCount }}</div>
        <span class="wb-card-hint">建议优先人工回拨确认</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">已确认跌倒</span>
        <div class="wb-card-value">{{ confirmedCount }}</div>
        <span class="wb-card-hint">需要跟进现场响应情况</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">误报</span>
        <div class="wb-card-value">{{ falseAlarmCount }}</div>
        <span class="wb-card-hint">用于评估传感策略是否过敏</span>
      </div>
    </div>

    <div class="wb-grid-2" style="margin-bottom: 20px">
      <div class="wb-filter-card">
        <div class="wb-page-header" style="margin-bottom: 10px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">监测策略</span>
            <span class="wb-page-subtitle">灵敏度越高，越容易触发预警，也越需要控制误报率。</span>
          </div>
        </div>
        <el-row :gutter="12" align="middle">
          <el-col :span="10">
            <el-select v-model="sensitivity" style="width: 100%">
              <el-option label="高灵敏" value="high" />
              <el-option label="标准" value="medium" />
              <el-option label="低灵敏" value="low" />
            </el-select>
          </el-col>
          <el-col :span="7">
            <span class="wb-chip">当前：{{ sensitivityLabel(sensitivity) }}</span>
          </el-col>
          <el-col :span="7" style="display: flex; justify-content: flex-end">
            <el-button type="primary" :loading="settingsSaving" @click="saveSettings">保存策略</el-button>
          </el-col>
        </el-row>
      </div>

      <div class="wb-filter-card">
        <div class="wb-page-header" style="margin-bottom: 10px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">风险筛选</span>
            <span class="wb-page-subtitle">按事件状态快速切换值班视角。</span>
          </div>
        </div>
        <el-row :gutter="12" align="middle">
          <el-col :span="12">
            <el-select v-model="statusFilter" placeholder="事件状态" clearable style="width: 100%">
              <el-option label="监测中" value="detecting" />
              <el-option label="已确认" value="confirmed" />
              <el-option label="已取消" value="cancelled" />
              <el-option label="误报" value="false_alarm" />
            </el-select>
          </el-col>
          <el-col :span="12" style="display: flex; justify-content: flex-end">
            <span class="wb-chip">优先查看“监测中”与“已确认”</span>
          </el-col>
        </el-row>
      </div>
    </div>

    <div class="wb-panel">
      <div class="wb-page-header" style="margin-bottom: 14px">
        <div>
          <span class="wb-page-title" style="font-size: 22px">事件明细</span>
          <span class="wb-page-subtitle">保留传感指标、对象信息和时间线，方便核查判定逻辑。</span>
        </div>
      </div>
      <el-table :data="events" stripe v-loading="loading">
        <template #empty>
          <div style="padding: 28px; text-align: center; color: var(--wb-text-soft)">
            {{ loading ? '加载中...' : '暂无跌倒事件' }}
          </div>
        </template>
        <el-table-column prop="id" label="事件 ID" width="100" />
        <el-table-column label="关注对象" min-width="150">
          <template #default="{ row }">
            <div>{{ formatUser(row.nickname) || `用户 #${row.userId}` }}</div>
            <div style="font-size: 12px; color: var(--wb-text-soft); margin-top: 4px">{{ row.phone || '未留手机号' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="事件状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="灵敏度" width="110">
          <template #default="{ row }">{{ sensitivityLabel(row.sensitivity) }}</template>
        </el-table-column>
        <el-table-column label="垂直峰值" width="120">
          <template #default="{ row }">{{ readMetric(row.sensorData, 'verticalPeak') }}</template>
        </el-table-column>
        <el-table-column label="水平变化率" width="130">
          <template #default="{ row }">{{ readMetric(row.sensorData, 'horizontalChangeRate') }}</template>
        </el-table-column>
        <el-table-column label="触发时间" width="180"><template #default="{ row }">{{ formatTime(row.detectedAt) }}</template></el-table-column>
        <el-table-column label="确认时间" width="180"><template #default="{ row }">{{ formatTime(row.confirmedAt) }}</template></el-table-column>
      </el-table>
      <div style="display: flex; justify-content: flex-end; margin-top: 16px">
        <el-pagination
          v-model:current-page="page"
          layout="total, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          @current-change="fetchHistory"
        />
      </div>
    </div>
  </div>
</template>



