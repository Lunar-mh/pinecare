<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getAdminMedicationLogs, updateAdminMedicationLogStatus } from '@/services'
import type { AdminMedicationLogItem } from '@/services'

const loading = ref(false)
const search = ref('')
const status = ref<'' | 'pending' | 'taken' | 'skipped' | 'missed'>('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const list = ref<AdminMedicationLogItem[]>([])

const pendingCount = computed(() => list.value.filter((item) => item.status === 'pending').length)
const takenCount = computed(() => list.value.filter((item) => item.status === 'taken').length)
const missedCount = computed(() => list.value.filter((item) => item.status === 'missed').length)

async function fetchAdminMedicationLogs() {
  loading.value = true
  try {
    const data = await getAdminMedicationLogs({
      page: page.value,
      pageSize: pageSize.value,
      search: search.value || undefined,
      status: status.value || undefined,
    })

    list.value = data.list || []
    total.value = data.pagination?.total || 0
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load medication logs.'
    ElMessage.error(message)
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function updateStatus(row: AdminMedicationLogItem, nextStatus: 'taken' | 'skipped' | 'missed') {
  try {
    await updateAdminMedicationLogStatus(row.id, nextStatus)
    ElMessage.success(`Log #${row.id} updated to ${nextStatus}.`)
    await fetchAdminMedicationLogs()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update log status.'
    ElMessage.error(message)
  }
}

watch([search, status], () => {
  page.value = 1
  fetchAdminMedicationLogs()
})

onMounted(fetchAdminMedicationLogs)
</script>

<template>
  <div class="medication-page">
    <div class="page-header">
      <span class="page-title">Medication Logs (Admin)</span>
      <el-button :icon="Refresh" @click="fetchAdminMedicationLogs">Refresh</el-button>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #f57c00">{{ pendingCount }}</div>
          <div class="stat-label">Pending</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #2e7d32">{{ takenCount }}</div>
          <div class="stat-label">Taken</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #c62828">{{ missedCount }}</div>
          <div class="stat-label">Missed</div>
        </div>
      </el-col>
    </el-row>

    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input
            v-model="search"
            placeholder="Search by user / phone / medication / log id"
            :prefix-icon="Search"
            clearable
          />
        </el-col>
        <el-col :span="5">
          <el-select v-model="status" placeholder="Status" clearable style="width: 100%">
            <el-option label="Pending" value="pending" />
            <el-option label="Taken" value="taken" />
            <el-option label="Skipped" value="skipped" />
            <el-option label="Missed" value="missed" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card">
      <el-table :data="list" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="Log ID" width="90" />
        <el-table-column prop="nickname" label="User" width="120" />
        <el-table-column prop="phone" label="Phone" width="150" />
        <el-table-column prop="medicationName" label="Medication" min-width="150" />
        <el-table-column prop="dosage" label="Dosage" width="100" />
        <el-table-column prop="scheduledTime" label="Scheduled" min-width="160" />
        <el-table-column prop="actualTime" label="Actual" min-width="160" />
        <el-table-column label="Status" width="110">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'taken' ? 'success' : row.status === 'pending' ? 'warning' : 'info'"
              size="small"
            >
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="180" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button type="success" link size="small" @click="updateStatus(row, 'taken')">Taken</el-button>
              <el-button type="warning" link size="small" @click="updateStatus(row, 'skipped')">Skip</el-button>
              <el-button type="danger" link size="small" @click="updateStatus(row, 'missed')">Miss</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-pagination">
        <el-pagination
          v-model:current-page="page"
          layout="total, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          @current-change="fetchAdminMedicationLogs"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.medication-page { max-width: 1200px; }
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
