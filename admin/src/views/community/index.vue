<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { createCommunityOrder, getCommunityOrders, getCommunityStats } from '@/services'
import { usePagination } from '@/composables/usePagination'
import type { CommunityOrderItem, CommunityStats } from '@/services'

const stats = ref<CommunityStats | null>(null)
const statusFilter = ref('')
const dialogVisible = ref(false)
const submitLoading = ref(false)
const form = reactive({
  service_type: 'door_visit',
  elder_id: 1,
  scheduled_at: '',
})

const {
  page,
  pageSize,
  total,
  list: orders,
  loading,
  loadData,
} = usePagination<CommunityOrderItem>(getCommunityOrders, 10)

async function fetchData() {
  try {
    const [statsData] = await Promise.all([
      getCommunityStats(),
      loadData({ status: statusFilter.value || undefined }),
    ])
    stats.value = statsData
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '社区运营数据加载失败')
  }
}

async function submitCreateOrder() {
  if (!form.service_type || !form.elder_id) {
    ElMessage.warning('请填写服务类型和长辈编号')
    return
  }
  submitLoading.value = true
  try {
    await createCommunityOrder({
      service_type: form.service_type,
      elder_id: Number(form.elder_id),
      scheduled_at: form.scheduled_at || undefined,
    })
    dialogVisible.value = false
    ElMessage.success('助老工单创建成功')
    await fetchData()
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '助老工单创建失败')
  } finally {
    submitLoading.value = false
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待指派',
    assigned: '已指派',
    processing: '服务中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

function statusTagType(status: string): 'warning' | 'primary' | 'info' | 'success' | 'danger' {
  if (status === 'pending') return 'warning'
  if (status === 'assigned' || status === 'processing') return 'primary'
  if (status === 'completed') return 'success'
  return 'info'
}

const formatTime = (_row: unknown, _col: unknown, val: string | null) => {
  if (!val) return '-'
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return val
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

watch(statusFilter, () => {
  page.value = 1
  fetchData()
})
onMounted(fetchData)
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">社区运营</span>
        <span class="wb-page-subtitle">在册长辈、志愿者力量与社区助老工单收进同一运营视图。</span>
      </div>
      <div style="display:flex; gap:10px">
        <el-button :icon="Refresh" @click="fetchData">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="dialogVisible = true">派发工单</el-button>
      </div>
    </div>

    <div class="wb-metric-grid">
      <div class="wb-metric-card"><span class="wb-card-label">活跃长辈</span><div class="wb-card-value">{{ stats?.overview.active_elders || 0 }}</div><span class="wb-card-hint">当前社区照护对象</span></div>
      <div class="wb-metric-card"><span class="wb-card-label">志愿者</span><div class="wb-card-value">{{ stats?.overview.volunteers || 0 }}</div><span class="wb-card-hint">可调度服务力量</span></div>
      <div class="wb-metric-card"><span class="wb-card-label">服务工单</span><div class="wb-card-value">{{ stats?.overview.total_orders || 0 }}</div><span class="wb-card-hint">本社区累计工单</span></div>
      <div class="wb-metric-card"><span class="wb-card-label">服务时长</span><div class="wb-card-value">{{ stats?.overview.total_service_hours || 0 }}<small>小时</small></div><span class="wb-card-hint">累计服务投入</span></div>
    </div>

    <div class="wb-filter-card">
      <el-select v-model="statusFilter" placeholder="筛选工单状态" clearable style="width: 240px">
        <el-option label="待指派" value="pending" />
        <el-option label="已指派" value="assigned" />
        <el-option label="服务中" value="processing" />
        <el-option label="已完成" value="completed" />
        <el-option label="已取消" value="cancelled" />
      </el-select>
    </div>

    <div class="wb-panel">
      <div class="wb-page-header" style="margin-bottom: 14px">
        <div>
          <span class="wb-page-title" style="font-size: 22px">助老工单列表</span>
          <span class="wb-page-subtitle">跟踪长辈居家互助服务指派与履约状态。</span>
        </div>
      </div>
      <el-table :data="orders" stripe v-loading="loading">
        <el-table-column prop="order_no" label="工单编号" min-width="180" />
        <el-table-column prop="service_type" label="服务类型" width="140" />
        <el-table-column prop="elder_id" label="长辈 ID" width="110" />
        <el-table-column prop="volunteer_id" label="志愿者 ID" width="120">
          <template #default="{ row }">{{ row.volunteer_id ?? '待指派' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="scheduled_at" label="预约时间" min-width="170" :formatter="formatTime" />
        <el-table-column prop="created_at" label="创建时间" min-width="170" :formatter="formatTime" />
      </el-table>
      <div style="display:flex; justify-content:flex-end; margin-top:16px">
        <el-pagination v-model:current-page="page" layout="total, prev, pager, next" :total="total" :page-size="pageSize" @current-change="fetchData" />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" title="创建社区助老工单" width="520px">
      <el-form :model="form" label-width="110px">
        <el-form-item label="服务类型">
          <el-select v-model="form.service_type" style="width:100%">
            <el-option label="上门探访" value="door_visit" />
            <el-option label="陪诊助医" value="medical" />
            <el-option label="居家照护" value="care" />
            <el-option label="应急协助" value="emergency" />
          </el-select>
        </el-form-item>
        <el-form-item label="长辈编号"><el-input-number v-model="form.elder_id" :min="1" style="width:100%" /></el-form-item>
        <el-form-item label="预约时间"><el-date-picker v-model="form.scheduled_at" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitCreateOrder">创建工单</el-button>
      </template>
    </el-dialog>
  </div>
</template>
