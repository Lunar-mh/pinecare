<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { getAdminMedicationLogs, updateAdminMedicationLogStatus } from '@/services'
import { usePagination } from '@/composables/usePagination'
import type { AdminMedicationLogItem } from '@/services'

const search = ref('')
const status = ref<'' | 'pending' | 'taken' | 'skipped' | 'missed'>('')

const {
  page,
  pageSize,
  total,
  list,
  loading,
  loadData,
} = usePagination<AdminMedicationLogItem>(getAdminMedicationLogs, 10)

const pendingCount = computed(() => list.value.filter(item => item.status === 'pending').length)
const takenCount = computed(() => list.value.filter(item => item.status === 'taken').length)
const missedCount = computed(() => list.value.filter(item => item.status === 'missed').length)

async function fetchAdminMedicationLogs() {
  try {
    await loadData({
      search: search.value || undefined,
      status: status.value || undefined,
    })
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load medication logs')
  }
}

async function updateStatus(row: AdminMedicationLogItem, nextStatus: 'taken' | 'skipped' | 'missed') {
  try {
    await updateAdminMedicationLogStatus(row.id, nextStatus)
    ElMessage.success('Status updated')
    await fetchAdminMedicationLogs()
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to update status')
  }
}

watch([search, status], () => {
  page.value = 1
  fetchAdminMedicationLogs()
})
onMounted(fetchAdminMedicationLogs)
</script>

<template>
  <div>
    <div class="wb-page-header"><div><span class="wb-page-title">用药执行</span><span class="wb-page-subtitle">把待执行、已执行、漏服三类状态摆清楚，方便运营跟进。</span></div><el-button :icon="Refresh" @click="fetchAdminMedicationLogs">刷新</el-button></div>
    <div class="wb-metric-grid"><div class="wb-metric-card"><span class="wb-card-label">待处理</span><div class="wb-card-value">{{ pendingCount }}</div><span class="wb-card-hint">建议优先提醒</span></div><div class="wb-metric-card"><span class="wb-card-label">已服药</span><div class="wb-card-value">{{ takenCount }}</div><span class="wb-card-hint">今日完成项</span></div><div class="wb-metric-card"><span class="wb-card-label">漏服</span><div class="wb-card-value">{{ missedCount }}</div><span class="wb-card-hint">需要补跟进</span></div></div>
    <div class="wb-filter-card"><div style="display:flex; gap:12px; flex-wrap:wrap"><el-input v-model="search" :prefix-icon="Search" placeholder="搜索用户、药名或手机号" clearable style="max-width:320px" /><el-select v-model="status" placeholder="状态" clearable style="width:180px"><el-option label="待处理" value="pending" /><el-option label="已服药" value="taken" /><el-option label="已跳过" value="skipped" /><el-option label="漏服" value="missed" /></el-select></div></div>
    <div class="wb-panel"><el-table :data="list" stripe v-loading="loading"><el-table-column prop="id" label="日志ID" width="90" /><el-table-column prop="nickname" label="用户" width="120" /><el-table-column prop="phone" label="手机号" width="150" /><el-table-column prop="medicationName" label="药物" min-width="150" /><el-table-column prop="dosage" label="剂量" width="100" /><el-table-column prop="scheduledTime" label="计划时间" min-width="160" /><el-table-column prop="actualTime" label="实际时间" min-width="160" /><el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="row.status === 'taken' ? 'success' : row.status === 'pending' ? 'warning' : row.status === 'missed' ? 'danger' : 'info'">{{ row.status }}</el-tag></template></el-table-column><el-table-column label="操作" width="190" fixed="right"><template #default="{ row }"><template v-if="row.status === 'pending'"><el-button type="success" link size="small" @click="updateStatus(row, 'taken')">记为已服</el-button><el-button type="warning" link size="small" @click="updateStatus(row, 'skipped')">跳过</el-button><el-button type="danger" link size="small" @click="updateStatus(row, 'missed')">漏服</el-button></template></template></el-table-column></el-table><div style="display:flex; justify-content:flex-end; margin-top:16px"><el-pagination v-model:current-page="page" layout="total, prev, pager, next" :total="total" :page-size="pageSize" @current-change="fetchAdminMedicationLogs" /></div></div>
  </div>
</template>
