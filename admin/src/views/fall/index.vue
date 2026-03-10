<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getFallHistory, getFallSettings, updateFallSettings } from '@/services'
import type { FallEventItem, FallEventStatus } from '@/services'

const loading = ref(false)
const settingsSaving = ref(false)
const events = ref<FallEventItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const statusFilter = ref<FallEventStatus | ''>('')
const sensitivity = ref<'high' | 'medium' | 'low'>('medium')

const detectingCount = computed(() => events.value.filter((item) => item.status === 'detecting').length)
const confirmedCount = computed(() => events.value.filter((item) => item.status === 'confirmed').length)
const falseAlarmCount = computed(() => events.value.filter((item) => item.status === 'false_alarm').length)

function statusTagType(status: FallEventStatus): 'warning' | 'success' | 'info' {
  if (status === 'detecting') return 'warning'
  if (status === 'confirmed') return 'success'
  return 'info'
}

function readMetric(sensorData: Record<string, unknown> | null, key: string): string {
  if (!sensorData) return '-'
  const value = sensorData[key]
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  return '-'
}

async function fetchHistory() {
  loading.value = true
  try {
    const data = await getFallHistory({
      page: page.value,
      pageSize: pageSize.value,
      status: statusFilter.value || undefined,
    })
    events.value = data.list || []
    total.value = data.pagination?.total || 0
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load fall history.'
    ElMessage.error(message)
    events.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function fetchSettings() {
  try {
    const data = await getFallSettings()
    sensitivity.value = data.sensitivity
  } catch (_err: unknown) {
    // ignore settings load failure
  }
}

async function saveSettings() {
  settingsSaving.value = true
  try {
    const data = await updateFallSettings(sensitivity.value)
    sensitivity.value = data.sensitivity
    ElMessage.success('Sensitivity updated.')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update sensitivity.'
    ElMessage.error(message)
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
  <div class="fall-page">
    <div class="page-header">
      <span class="page-title">Fall Detection</span>
      <el-button :icon="Refresh" @click="fetchHistory">Refresh</el-button>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #f57c00">{{ detectingCount }}</div>
          <div class="stat-label">Detecting</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #2e7d32">{{ confirmedCount }}</div>
          <div class="stat-label">Confirmed</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #78909c">{{ falseAlarmCount }}</div>
          <div class="stat-label">False Alarm</div>
        </div>
      </el-col>
    </el-row>

    <el-card class="settings-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="6">
          <el-select v-model="sensitivity" style="width: 100%">
            <el-option label="High" value="high" />
            <el-option label="Medium" value="medium" />
            <el-option label="Low" value="low" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" :loading="settingsSaving" @click="saveSettings">Save Sensitivity</el-button>
        </el-col>
        <el-col :span="5">
          <el-select v-model="statusFilter" placeholder="Status" clearable style="width: 100%">
            <el-option label="Detecting" value="detecting" />
            <el-option label="Confirmed" value="confirmed" />
            <el-option label="Cancelled" value="cancelled" />
            <el-option label="False Alarm" value="false_alarm" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card">
      <el-table :data="events" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="Event ID" width="100" />
        <el-table-column label="Status" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sensitivity" label="Sensitivity" width="120" />
        <el-table-column label="Vertical Peak" width="130">
          <template #default="{ row }">{{ readMetric(row.sensorData, 'verticalPeak') }}</template>
        </el-table-column>
        <el-table-column label="Horizontal Rate" width="140">
          <template #default="{ row }">{{ readMetric(row.sensorData, 'horizontalChangeRate') }}</template>
        </el-table-column>
        <el-table-column prop="detectedAt" label="Detected At" min-width="170" />
        <el-table-column prop="confirmedAt" label="Confirmed At" min-width="170" />
      </el-table>

      <div class="table-pagination">
        <el-pagination
          v-model:current-page="page"
          layout="total, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          @current-change="fetchHistory"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.fall-page { max-width: 1200px; }
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.stats-row { margin-bottom: 16px; }
.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.stat-num { font-size: 32px; font-weight: 700; line-height: 1.2; }
.stat-label { font-size: 13px; color: #999; margin-top: 4px; }
.settings-card { margin-bottom: 16px; border-radius: 8px; }
.table-card { border-radius: 8px; }
.table-pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
