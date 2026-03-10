<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getSosHistory, confirmSosEvent, resolveSosEvent } from '@/services'
import type { SosEventItem, SosEventStatus } from '@/services'

const loading = ref(false)
const list = ref<SosEventItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const statusFilter = ref<SosEventStatus | ''>('')

const triggeredCount = computed(() => list.value.filter((item) => item.event_status === 'triggered').length)
const confirmedCount = computed(() => list.value.filter((item) => item.event_status === 'confirmed').length)
const resolvedCount = computed(() => list.value.filter((item) => item.event_status === 'resolved').length)

function statusTagType(status: SosEventStatus): 'danger' | 'warning' | 'success' | 'info' {
  if (status === 'triggered') return 'danger'
  if (status === 'confirmed') return 'warning'
  if (status === 'resolved') return 'success'
  return 'info'
}

async function fetchHistory() {
  loading.value = true
  try {
    const data = await getSosHistory({
      page: page.value,
      pageSize: pageSize.value,
      status: statusFilter.value || undefined,
    })
    list.value = data.list || []
    total.value = data.pagination?.total || 0
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load SOS history.'
    ElMessage.error(message)
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function handleConfirm(row: SosEventItem) {
  try {
    await confirmSosEvent(row.event_id)
    ElMessage.success('Event confirmed.')
    await fetchHistory()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Confirm failed.'
    ElMessage.error(message)
  }
}

async function handleResolve(row: SosEventItem) {
  try {
    await resolveSosEvent(row.event_id)
    ElMessage.success('Event resolved.')
    await fetchHistory()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Resolve failed.'
    ElMessage.error(message)
  }
}

watch(statusFilter, () => {
  page.value = 1
  fetchHistory()
})

onMounted(fetchHistory)
</script>

<template>
  <div class="sos-page">
    <div class="page-header">
      <span class="page-title">SOS Events</span>
      <el-button :icon="Refresh" @click="fetchHistory">Refresh</el-button>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #c62828">{{ triggeredCount }}</div>
          <div class="stat-label">Triggered</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #f57c00">{{ confirmedCount }}</div>
          <div class="stat-label">Confirmed</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #2e7d32">{{ resolvedCount }}</div>
          <div class="stat-label">Resolved</div>
        </div>
      </el-col>
    </el-row>

    <el-card class="filter-card">
      <el-row :gutter="12">
        <el-col :span="5">
          <el-select v-model="statusFilter" placeholder="Status" clearable style="width: 100%">
            <el-option label="Triggered" value="triggered" />
            <el-option label="Confirmed" value="confirmed" />
            <el-option label="Resolved" value="resolved" />
            <el-option label="Cancelled" value="cancelled" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card">
      <el-table :data="list" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="event_id" label="Event ID" width="100" />
        <el-table-column label="Status" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.event_status)" size="small">{{ row.event_status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="trigger_type" label="Trigger" width="120" />
        <el-table-column prop="address" label="Address" min-width="180" show-overflow-tooltip />
        <el-table-column prop="created_at" label="Created At" min-width="170" />
        <el-table-column prop="confirmed_at" label="Confirmed At" min-width="170" />
        <el-table-column prop="resolved_at" label="Resolved At" min-width="170" />
        <el-table-column label="Actions" width="170" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.event_status === 'triggered'"
              type="warning"
              link
              size="small"
              @click="handleConfirm(row)"
            >
              Confirm
            </el-button>
            <el-button
              v-if="row.event_status === 'triggered' || row.event_status === 'confirmed'"
              type="success"
              link
              size="small"
              @click="handleResolve(row)"
            >
              Resolve
            </el-button>
          </template>
        </el-table-column>
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
.sos-page { max-width: 1200px; }
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
.filter-card { margin-bottom: 16px; border-radius: 8px; }
.table-card { border-radius: 8px; }
.table-pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
