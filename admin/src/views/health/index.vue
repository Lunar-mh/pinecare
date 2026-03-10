<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getAdminHealthOverview } from '@/services'
import type { AdminHealthOverviewItem } from '@/services'

const loading = ref(false)
const search = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const list = ref<AdminHealthOverviewItem[]>([])

const warningCount = computed(() => list.value.filter((item) => item.riskLevel === 'warning').length)
const dangerCount = computed(() => list.value.filter((item) => item.riskLevel === 'danger').length)

function riskTagType(level: 'normal' | 'warning' | 'danger'): 'success' | 'warning' | 'danger' {
  if (level === 'danger') return 'danger'
  if (level === 'warning') return 'warning'
  return 'success'
}

async function fetchHealthOverview() {
  loading.value = true
  try {
    const data = await getAdminHealthOverview({
      page: page.value,
      pageSize: pageSize.value,
      search: search.value || undefined,
    })

    list.value = data.list || []
    total.value = data.pagination?.total || 0
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load health overview.'
    ElMessage.error(message)
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

watch(search, () => {
  page.value = 1
  fetchHealthOverview()
})

onMounted(fetchHealthOverview)
</script>

<template>
  <div class="health-page">
    <div class="page-header">
      <span class="page-title">Health Overview (Admin)</span>
      <el-button :icon="Refresh" @click="fetchHealthOverview">Refresh</el-button>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #01579b">{{ total }}</div>
          <div class="stat-label">Total Users</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #f57c00">{{ warningCount }}</div>
          <div class="stat-label">Warning Risk</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #c62828">{{ dangerCount }}</div>
          <div class="stat-label">Danger Risk</div>
        </div>
      </el-col>
    </el-row>

    <el-card class="filter-card">
      <el-row :gutter="12">
        <el-col :span="8">
          <el-input
            v-model="search"
            placeholder="Search by user / phone / ID"
            :prefix-icon="Search"
            clearable
          />
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card">
      <el-table :data="list" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="userId" label="User ID" width="100" />
        <el-table-column prop="nickname" label="Nickname" width="130" />
        <el-table-column prop="phone" label="Phone" width="150" />
        <el-table-column prop="age" label="Age" width="90" />
        <el-table-column prop="bloodPressure" label="Blood Pressure" width="130" />
        <el-table-column prop="heartRate" label="Heart Rate" width="120" />
        <el-table-column prop="bloodSugar" label="Blood Sugar" width="120" />
        <el-table-column label="Risk" width="100">
          <template #default="{ row }">
            <el-tag :type="riskTagType(row.riskLevel)" size="small">{{ row.riskLevel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastUpdate" label="Last Update" min-width="170" />
      </el-table>

      <div class="table-pagination">
        <el-pagination
          v-model:current-page="page"
          layout="total, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          @current-change="fetchHealthOverview"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.health-page { max-width: 1200px; }
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
