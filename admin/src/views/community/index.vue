<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import { createCommunityActivity, getCommunityActivities, getCommunityStats } from '@/services'
import type { CommunityActivityItem, CommunityStats } from '@/services'

const loading = ref(false)
const stats = ref<CommunityStats | null>(null)
const activities = ref<CommunityActivityItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const keyword = ref('')
const dialogVisible = ref(false)
const submitLoading = ref(false)
const form = reactive({ title: '', content: '', start_time: '', end_time: '', max_participants: null as number | null })

async function fetchData() {
  loading.value = true
  try {
    const [statsData, activitiesData] = await Promise.all([
      getCommunityStats(),
      getCommunityActivities({ page: page.value, pageSize: pageSize.value, keyword: keyword.value || undefined }),
    ])
    stats.value = statsData
    activities.value = activitiesData.list || []
    total.value = activitiesData.pagination?.total || 0
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '社区运营数据加载失败')
  } finally {
    loading.value = false
  }
}

async function submitCreateActivity() {
  if (!form.title || !form.content || !form.start_time || !form.end_time) {
    ElMessage.warning('请把活动名称、内容和时间补完整')
    return
  }
  submitLoading.value = true
  try {
    await createCommunityActivity(form)
    dialogVisible.value = false
    ElMessage.success('活动已创建')
    fetchData()
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '创建活动失败')
  } finally {
    submitLoading.value = false
  }
}

watch(keyword, () => { page.value = 1; fetchData() })
onMounted(fetchData)
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">社区运营</span>
        <span class="wb-page-subtitle">活动、服务时长和在册人数收进一个运营视图。</span>
      </div>
      <div style="display:flex; gap:10px">
        <el-button :icon="Refresh" @click="fetchData">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="dialogVisible = true">创建活动</el-button>
      </div>
    </div>

    <div class="wb-metric-grid">
      <div class="wb-metric-card"><span class="wb-card-label">活跃长辈</span><div class="wb-card-value">{{ stats?.overview.active_elders || 0 }}</div><span class="wb-card-hint">当前社区照护对象</span></div>
      <div class="wb-metric-card"><span class="wb-card-label">志愿者</span><div class="wb-card-value">{{ stats?.overview.volunteers || 0 }}</div><span class="wb-card-hint">可调度服务力量</span></div>
      <div class="wb-metric-card"><span class="wb-card-label">服务工单</span><div class="wb-card-value">{{ stats?.overview.total_orders || 0 }}</div><span class="wb-card-hint">本社区累计工单</span></div>
      <div class="wb-metric-card"><span class="wb-card-label">服务时长</span><div class="wb-card-value">{{ stats?.overview.total_service_hours || 0 }}<small>小时</small></div><span class="wb-card-hint">累计服务投入</span></div>
    </div>

    <div class="wb-filter-card">
      <el-input v-model="keyword" :prefix-icon="Search" placeholder="搜索活动名称" clearable style="max-width:320px" />
    </div>

    <div class="wb-panel">
      <div class="wb-page-header" style="margin-bottom: 14px">
        <div>
          <span class="wb-page-title" style="font-size: 22px">社区活动</span>
          <span class="wb-page-subtitle">保留运营最常用的一张活动表。</span>
        </div>
      </div>
      <el-table :data="activities" stripe v-loading="loading">
        <el-table-column prop="title" label="活动名称" min-width="180" />
        <el-table-column prop="content" label="活动内容" min-width="220" show-overflow-tooltip />
        <el-table-column prop="start_time" label="开始时间" width="180" />
        <el-table-column prop="end_time" label="结束时间" width="180" />
        <el-table-column prop="registered_count" label="报名人数" width="110" />
      </el-table>
      <div style="display:flex; justify-content:flex-end; margin-top:16px"><el-pagination v-model:current-page="page" layout="total, prev, pager, next" :total="total" :page-size="pageSize" @current-change="fetchData" /></div>
    </div>

    <el-dialog v-model="dialogVisible" title="创建社区活动" width="560px">
      <el-form :model="form" label-width="110px">
        <el-form-item label="活动名称"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="活动内容"><el-input v-model="form.content" type="textarea" :rows="4" /></el-form-item>
        <el-form-item label="开始时间"><el-date-picker v-model="form.start_time" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" /></el-form-item>
        <el-form-item label="结束时间"><el-date-picker v-model="form.end_time" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" /></el-form-item>
        <el-form-item label="人数上限"><el-input-number v-model="form.max_participants" :min="1" :max="9999" style="width:100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitCreateActivity">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>
