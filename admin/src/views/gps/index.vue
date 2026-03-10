<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getAdminGpsCurrent, getAdminGpsTrail } from '@/services'
import type { AdminGpsCurrentItem, GpsTrailItem } from '@/services'

const loading = ref(false)
const trailLoading = ref(false)

const search = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const currentList = ref<AdminGpsCurrentItem[]>([])

const selectedUserId = ref<number | null>(null)
const trail = ref<GpsTrailItem[]>([])
const range = ref<[string, string]>(['', ''])

const onlineCount = computed(() => currentList.value.length)

function formatDateTime(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}:${s}`
}

function initRange() {
  const end = new Date()
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
  range.value = [formatDateTime(start), formatDateTime(end)]
}

async function fetchCurrentList() {
  loading.value = true
  try {
    const data = await getAdminGpsCurrent({
      page: page.value,
      pageSize: pageSize.value,
      search: search.value || undefined,
    })

    currentList.value = data.list || []
    total.value = data.pagination?.total || 0

    const firstUser: AdminGpsCurrentItem | null = currentList.value.length > 0 ? currentList.value[0] ?? null : null
    if (!selectedUserId.value && firstUser) {
      selectedUserId.value = firstUser.userId
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load GPS current list.'
    ElMessage.error(message)
    currentList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function fetchTrail() {
  if (!selectedUserId.value || !range.value[0] || !range.value[1]) {
    trail.value = []
    return
  }

  trailLoading.value = true
  try {
    const data = await getAdminGpsTrail({
      userId: selectedUserId.value,
      startDate: range.value[0],
      endDate: range.value[1],
      limit: 1000,
    })

    trail.value = data.list || []
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load GPS trail.'
    ElMessage.error(message)
    trail.value = []
  } finally {
    trailLoading.value = false
  }
}

watch(search, () => {
  page.value = 1
  fetchCurrentList()
})

watch(selectedUserId, fetchTrail)

onMounted(async () => {
  initRange()
  await fetchCurrentList()
  await fetchTrail()
})
</script>

<template>
  <div class="gps-page">
    <div class="page-header">
      <span class="page-title">GPS Tracking (Admin)</span>
      <el-button :icon="Refresh" @click="fetchCurrentList">Refresh</el-button>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="12">
        <div class="stat-card">
          <div class="stat-num" style="color: #01579b">{{ total }}</div>
          <div class="stat-label">Users With Location</div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="stat-card">
          <div class="stat-num" style="color: #2e7d32">{{ onlineCount }}</div>
          <div class="stat-label">Rows In Current Page</div>
        </div>
      </el-col>
    </el-row>

    <el-card class="filter-card" style="margin-bottom: 16px">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input
            v-model="search"
            placeholder="Search user / phone / id"
            :prefix-icon="Search"
            clearable
          />
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card" style="margin-bottom: 16px">
      <template #header>
        <span>Current Locations</span>
      </template>
      <el-table :data="currentList" stripe style="width: 100%" v-loading="loading" @row-click="(row: AdminGpsCurrentItem) => { selectedUserId = row.userId }">
        <el-table-column prop="userId" label="User ID" width="100" />
        <el-table-column prop="nickname" label="Nickname" width="120" />
        <el-table-column prop="phone" label="Phone" width="150" />
        <el-table-column prop="latitude" label="Latitude" width="130" />
        <el-table-column prop="longitude" label="Longitude" width="130" />
        <el-table-column prop="accuracy" label="Accuracy" width="100" />
        <el-table-column prop="locationType" label="Type" width="100" />
        <el-table-column prop="updatedAt" label="Updated At" min-width="170" />
      </el-table>

      <div class="table-pagination">
        <el-pagination
          v-model:current-page="page"
          layout="total, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          @current-change="fetchCurrentList"
        />
      </div>
    </el-card>

    <el-card class="filter-card" style="margin-bottom: 16px">
      <el-row :gutter="12" align="middle">
        <el-col :span="6">
          <el-select v-model="selectedUserId" placeholder="Select user" style="width: 100%" clearable>
            <el-option
              v-for="item in currentList"
              :key="item.userId"
              :label="`${item.nickname} (#${item.userId})`"
              :value="item.userId"
            />
          </el-select>
        </el-col>
        <el-col :span="10">
          <el-date-picker
            v-model="range"
            type="datetimerange"
            value-format="YYYY-MM-DD HH:mm:ss"
            start-placeholder="Start time"
            end-placeholder="End time"
            style="width: 100%"
          />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="fetchTrail">Query Trail</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <span>Trail Points</span>
      </template>
      <el-table :data="trail" stripe style="width: 100%" v-loading="trailLoading">
        <el-table-column prop="id" label="ID" width="90" />
        <el-table-column prop="userId" label="User" width="90" />
        <el-table-column prop="latitude" label="Latitude" width="130" />
        <el-table-column prop="longitude" label="Longitude" width="130" />
        <el-table-column prop="accuracy" label="Accuracy" width="100" />
        <el-table-column prop="locationType" label="Type" width="100" />
        <el-table-column prop="createdAt" label="Time" min-width="170" />
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.gps-page { max-width: 1200px; }
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
.filter-card { border-radius: 8px; }
.table-card { border-radius: 8px; }
.table-pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>




