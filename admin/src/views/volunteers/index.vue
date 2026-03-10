<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getCommunityVolunteers } from '@/services'
import type { CommunityVolunteerItem } from '@/services'

const loading = ref(false)
const keyword = ref('')
const volunteers = ref<CommunityVolunteerItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const pageCount = computed(() => volunteers.value.length)

function roleText(role: string): string {
  if (role === 'admin') return 'Admin'
  if (role === 'leader') return 'Leader'
  return 'Volunteer'
}

async function fetchVolunteers() {
  loading.value = true
  try {
    const data = await getCommunityVolunteers({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
    })
    volunteers.value = data.list || []
    total.value = data.pagination?.total || 0
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load volunteers.'
    ElMessage.error(message)
    volunteers.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

watch(keyword, () => {
  page.value = 1
  fetchVolunteers()
})

onMounted(fetchVolunteers)
</script>

<template>
  <div class="volunteers-page">
    <div class="page-header">
      <span class="page-title">Volunteer Management</span>
      <el-button type="primary" :icon="Refresh" @click="fetchVolunteers">Refresh</el-button>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #01579b">{{ total }}</div>
          <div class="stat-label">Total Volunteers</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #2e7d32">{{ page }}</div>
          <div class="stat-label">Current Page</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #e65100">{{ pageCount }}</div>
          <div class="stat-label">Rows Loaded</div>
        </div>
      </el-col>
    </el-row>

    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input
            v-model="keyword"
            placeholder="Search by name or phone"
            :prefix-icon="Search"
            clearable
          />
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card">
      <el-table :data="volunteers" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="Name" width="140" />
        <el-table-column prop="phone" label="Phone" width="150" />
        <el-table-column label="Role" width="120">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : row.role === 'leader' ? 'warning' : 'success'" size="small">
              {{ roleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="community_id" label="Community" width="110" />
        <el-table-column prop="created_at" label="Joined At" />
      </el-table>

      <div class="table-pagination">
        <el-pagination
          v-model:current-page="page"
          layout="total, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          @current-change="fetchVolunteers"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.volunteers-page { max-width: 1200px; }
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
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.stat-num { font-size: 32px; font-weight: 700; line-height: 1.2; }
.stat-label { font-size: 13px; color: #999; margin-top: 4px; }
.filter-card { margin-bottom: 16px; border-radius: 8px; }
.table-card { border-radius: 8px; }
.table-pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
