<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getDrugInteractionHistory, acknowledgeDrugInteraction } from '@/services'
import type { DrugInteractionRecord, DrugRecordStatus, DrugRiskLevel } from '@/services'

const loading = ref(false)
const keyword = ref('')
const statusFilter = ref<DrugRecordStatus | ''>('')
const records = ref<DrugInteractionRecord[]>([])

const filteredRecords = computed(() => {
  if (!keyword.value) return records.value
  const text = keyword.value.trim().toLowerCase()
  return records.value.filter((item) => {
    return item.drugA.toLowerCase().includes(text) || item.drugB.toLowerCase().includes(text)
  })
})

const pendingCount = computed(() => records.value.filter((item) => item.status === 'pending').length)
const highRiskCount = computed(() => records.value.filter((item) => item.level === 'high').length)
const acknowledgedCount = computed(() => records.value.filter((item) => item.status === 'acknowledged').length)

function levelTagType(level: DrugRiskLevel): 'danger' | 'warning' | 'success' {
  if (level === 'high') return 'danger'
  if (level === 'medium') return 'warning'
  return 'success'
}

async function fetchHistory() {
  loading.value = true
  try {
    records.value = await getDrugInteractionHistory(statusFilter.value || undefined)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load drug interaction history.'
    ElMessage.error(message)
    records.value = []
  } finally {
    loading.value = false
  }
}

async function handleAcknowledge(row: DrugInteractionRecord) {
  try {
    await acknowledgeDrugInteraction(row.id)
    ElMessage.success('Risk acknowledged.')
    await fetchHistory()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Acknowledge failed.'
    ElMessage.error(message)
  }
}

watch(statusFilter, fetchHistory)
onMounted(fetchHistory)
</script>

<template>
  <div class="drug-page">
    <div class="page-header">
      <span class="page-title">Drug Interactions</span>
      <el-button :icon="Refresh" @click="fetchHistory">Refresh</el-button>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #c62828">{{ highRiskCount }}</div>
          <div class="stat-label">High Risk</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #f57c00">{{ pendingCount }}</div>
          <div class="stat-label">Pending</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #2e7d32">{{ acknowledgedCount }}</div>
          <div class="stat-label">Acknowledged</div>
        </div>
      </el-col>
    </el-row>

    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input
            v-model="keyword"
            placeholder="Search by drug name"
            :prefix-icon="Search"
            clearable
          />
        </el-col>
        <el-col :span="5">
          <el-select v-model="statusFilter" placeholder="Status" clearable style="width: 100%">
            <el-option label="Pending" value="pending" />
            <el-option label="Acknowledged" value="acknowledged" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card">
      <el-table :data="filteredRecords" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="drugA" label="Drug A" min-width="140" />
        <el-table-column prop="drugB" label="Drug B" min-width="140" />
        <el-table-column label="Risk" width="100">
          <template #default="{ row }">
            <el-tag :type="levelTagType(row.level)" size="small">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="riskDescription" label="Description" min-width="220" show-overflow-tooltip />
        <el-table-column prop="suggestion" label="Suggestion" min-width="220" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="Created At" min-width="170" />
        <el-table-column label="Status" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 'acknowledged' ? 'success' : 'warning'" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              type="primary"
              link
              size="small"
              @click="handleAcknowledge(row)"
            >
              Acknowledge
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.drug-page { max-width: 1200px; }
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
</style>
