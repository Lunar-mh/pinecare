<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { confirmSosEvent, getSosHistory, resolveSosEvent } from '@/services'
import { usePagination } from '@/composables/usePagination'
import type { SosEventItem, SosEventStatus } from '@/services'
import { formatTime } from '@/utils/format'

const statusFilter = ref<SosEventStatus | ''>('')

const {
  page,
  pageSize,
  total,
  list,
  loading,
  loadData,
} = usePagination<SosEventItem>(getSosHistory, 10)

const triggeredCount = computed(() => list.value.filter(item => item.event_status === 'triggered').length)
const confirmedCount = computed(() => list.value.filter(item => item.event_status === 'confirmed').length)
const resolvedCount = computed(() => list.value.filter(item => item.event_status === 'resolved').length)

function statusLabel(value: SosEventStatus): string {
  if (value === 'triggered') return '触发中'
  if (value === 'confirmed') return '已确认'
  if (value === 'resolved') return '已解决'
  if (value === 'cancelled') return '已取消'
  return value
}

function triggerTypeLabel(value: string): string {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized.includes('manual')) return '手动触发'
  if (normalized.includes('auto')) return '自动触发'
  return value || '-'
}

async function fetchHistory() {
  try {
    await loadData({ status: statusFilter.value || undefined })
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : 'SOS 历史事件加载失败')
  }
}

async function handleConfirm(row: SosEventItem) {
  try {
    await confirmSosEvent(row.event_id)
    ElMessage.success('事件已确认')
    await fetchHistory()
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '操作失败')
  }
}

async function handleResolve(row: SosEventItem) {
  try {
    await resolveSosEvent(row.event_id)
    ElMessage.success('事件已解决')
    await fetchHistory()
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '操作失败')
  }
}

watch(statusFilter, () => {
  page.value = 1
  fetchHistory()
})

onMounted(fetchHistory)
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">SOS 响应</span>
        <span class="wb-page-subtitle">当前触发、已确认、已解决三类事件一屏查看。</span>
      </div>
      <el-button :icon="Refresh" @click="fetchHistory">刷新</el-button>
    </div>

    <div class="wb-metric-grid">
      <div class="wb-metric-card">
        <span class="wb-card-label">触发中</span>
        <div class="wb-card-value">{{ triggeredCount }}</div>
        <span class="wb-card-hint">优先响应</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">已确认</span>
        <div class="wb-card-value">{{ confirmedCount }}</div>
        <span class="wb-card-hint">等待闭环</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">已解决</span>
        <div class="wb-card-value">{{ resolvedCount }}</div>
        <span class="wb-card-hint">可做复盘</span>
      </div>
    </div>

    <div class="wb-filter-card">
      <el-select v-model="statusFilter" placeholder="筛选状态" clearable style="width: 200px">
        <el-option label="触发中" value="triggered" />
        <el-option label="已确认" value="confirmed" />
        <el-option label="已解决" value="resolved" />
        <el-option label="已取消" value="cancelled" />
      </el-select>
    </div>

    <div class="wb-panel">
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column prop="event_id" label="事件ID" width="100" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.event_status === 'triggered' ? 'danger' : row.event_status === 'confirmed' ? 'warning' : row.event_status === 'resolved' ? 'success' : 'info'">
              {{ statusLabel(row.event_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="触发方式" width="120">
          <template #default="{ row }">{{ triggerTypeLabel(row.trigger_type) }}</template>
        </el-table-column>
        <el-table-column label="位置" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ String(row.address || '').replace('Community Building', '社区') }}</template>
        </el-table-column>
        <el-table-column label="触发时间" min-width="170">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="确认时间" min-width="170">
          <template #default="{ row }">{{ row.confirmed_at ? formatTime(row.confirmed_at) : '-' }}</template>
        </el-table-column>
        <el-table-column label="解决时间" min-width="170">
          <template #default="{ row }">{{ row.resolved_at ? formatTime(row.resolved_at) : '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.event_status === 'triggered'" type="warning" link size="small" @click="handleConfirm(row)">确认</el-button>
            <el-button v-if="row.event_status === 'triggered' || row.event_status === 'confirmed'" type="success" link size="small" @click="handleResolve(row)">解决</el-button>
            <span v-if="row.event_status === 'resolved' || row.event_status === 'cancelled'" style="color: var(--wb-text-soft); font-size: 14px;">已归档</span>
          </template>
        </el-table-column>
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
