<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { Search, Plus, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getCommunityStats, getCommunityActivities, createCommunityActivity } from '@/services'
import type { CommunityStats, CommunityActivityItem } from '@/services'

const loading = ref(false)
const keyword = ref('')
const stats = ref<CommunityStats | null>(null)
const activities = ref<CommunityActivityItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const dialogVisible = ref(false)
const submitLoading = ref(false)
const form = reactive({
  title: '',
  content: '',
  start_time: '',
  end_time: '',
  max_participants: null as number | null,
})

async function fetchData() {
  loading.value = true
  try {
    const [statsData, activitiesData] = await Promise.all([
      getCommunityStats(),
      getCommunityActivities({
        page: page.value,
        pageSize: pageSize.value,
        keyword: keyword.value || undefined,
      }),
    ])

    stats.value = statsData
    activities.value = activitiesData.list || []
    total.value = activitiesData.pagination?.total || 0
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load community data.'
    ElMessage.error(message)
    stats.value = null
    activities.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  form.title = ''
  form.content = ''
  form.start_time = ''
  form.end_time = ''
  form.max_participants = null
  dialogVisible.value = true
}

async function submitCreateActivity() {
  if (!form.title || !form.content || !form.start_time || !form.end_time) {
    ElMessage.warning('Please fill all required fields.')
    return
  }

  submitLoading.value = true
  try {
    await createCommunityActivity({
      title: form.title,
      content: form.content,
      start_time: form.start_time,
      end_time: form.end_time,
      max_participants: form.max_participants,
    })
    ElMessage.success('Activity created.')
    dialogVisible.value = false
    page.value = 1
    await fetchData()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Create activity failed.'
    ElMessage.error(message)
  } finally {
    submitLoading.value = false
  }
}

watch(keyword, () => {
  page.value = 1
  fetchData()
})

onMounted(fetchData)
</script>

<template>
  <div class="community-page">
    <div class="page-header">
      <span class="page-title">Community Operations</span>
      <div class="actions">
        <el-button :icon="Refresh" @click="fetchData">Refresh</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog">Create Activity</el-button>
      </div>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-num" style="color: #01579b">{{ stats?.overview.active_elders ?? 0 }}</div>
          <div class="stat-label">Active Elders</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-num" style="color: #2e7d32">{{ stats?.overview.volunteers ?? 0 }}</div>
          <div class="stat-label">Volunteers</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-num" style="color: #e65100">{{ stats?.overview.total_orders ?? 0 }}</div>
          <div class="stat-label">Service Orders</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-num" style="color: #6a1b9a">{{ stats?.overview.total_service_hours ?? 0 }}</div>
          <div class="stat-label">Service Hours</div>
        </div>
      </el-col>
    </el-row>

    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input
            v-model="keyword"
            placeholder="Search activities by title"
            :prefix-icon="Search"
            clearable
          />
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card">
      <el-table :data="activities" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="title" label="Title" min-width="180" />
        <el-table-column prop="content" label="Content" min-width="220" show-overflow-tooltip />
        <el-table-column prop="start_time" label="Start Time" width="180" />
        <el-table-column prop="end_time" label="End Time" width="180" />
        <el-table-column prop="registered_count" label="Registered" width="110" />
      </el-table>

      <div class="table-pagination">
        <el-pagination
          v-model:current-page="page"
          layout="total, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" title="Create Activity" width="560px">
      <el-form :model="form" label-width="130px">
        <el-form-item label="Title">
          <el-input v-model="form.title" placeholder="Enter activity title" />
        </el-form-item>
        <el-form-item label="Content">
          <el-input v-model="form.content" type="textarea" :rows="4" placeholder="Enter activity details" />
        </el-form-item>
        <el-form-item label="Start Time">
          <el-date-picker
            v-model="form.start_time"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="Select start time"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="End Time">
          <el-date-picker
            v-model="form.end_time"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="Select end time"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="Max Participants">
          <el-input-number v-model="form.max_participants" :min="1" :max="5000" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitCreateActivity">Create</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.community-page { max-width: 1200px; }
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.actions { display: flex; gap: 8px; }
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
