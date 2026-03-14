<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { bootstrapDemoScenario, getCommunityVolunteers } from '@/services'
import { usePagination } from '@/composables/usePagination'
import type { CommunityVolunteerItem } from '@/services'

const bootstrapLoading = ref(false)
const keyword = ref('')

const {
  page,
  pageSize,
  total,
  list: volunteers,
  loading,
  loadData,
} = usePagination<CommunityVolunteerItem>(getCommunityVolunteers, 10)

const pageCount = computed(() => volunteers.value.length)
const adminCount = computed(() => volunteers.value.filter(item => item.role === 'admin').length)
const leaderCount = computed(() => volunteers.value.filter(item => item.role === 'leader').length)
const volunteerCount = computed(() => volunteers.value.filter(item => item.role === 'volunteer').length)

function roleText(role: string): string {
  if (role === 'admin') return 'Admin'
  if (role === 'leader') return 'Leader'
  return 'Volunteer'
}

async function fetchVolunteers() {
  try {
    await loadData({ keyword: keyword.value || undefined })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load volunteer list'
    ElMessage.error(message)
  }
}

async function handleBootstrap() {
  bootstrapLoading.value = true
  try {
    const result = await bootstrapDemoScenario('volunteer-task-execution')
    ElMessage.success('Volunteer flow prepared: ' + result.title)
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to prepare volunteer flow')
  } finally {
    bootstrapLoading.value = false
  }
}

watch(keyword, () => {
  page.value = 1
  fetchVolunteers()
})

onMounted(fetchVolunteers)
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">志愿者管理</span>
        <span class="wb-page-subtitle">花名册、角色分布和答辩闭环剧本放在一页查看。</span>
      </div>
      <div style="display:flex; gap:10px">
        <el-button type="primary" :loading="bootstrapLoading" @click="handleBootstrap">准备志愿者闭环</el-button>
        <el-button :icon="Refresh" round @click="fetchVolunteers">刷新名册</el-button>
      </div>
    </div>

    <div class="wb-metric-grid">
      <div class="wb-metric-card">
        <span class="wb-card-label">志愿者总数</span>
        <div class="wb-card-value">{{ total }}</div>
        <span class="wb-card-hint">当前可见的社区志愿者与管理角色</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">管理员</span>
        <div class="wb-card-value">{{ adminCount }}</div>
        <span class="wb-card-hint">用于社区侧调度和审核</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">负责人</span>
        <div class="wb-card-value">{{ leaderCount }}</div>
        <span class="wb-card-hint">用于日常排班和带队</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">当前页数量</span>
        <div class="wb-card-value">{{ pageCount }}</div>
        <span class="wb-card-hint">便于答辩时快速核对列表与分页</span>
      </div>
    </div>

    <div class="wb-grid-2" style="margin-bottom: 20px">
      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 14px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">闭环说明</span>
            <span class="wb-page-subtitle">点击右上角即可准备志愿者接单、签到、完成和审计剧本。</span>
          </div>
        </div>
        <div class="wb-list">
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">关键链路</span>
              <span class="wb-list-desc">派单 -> 接单 -> 签到 -> 签退/完成 -> 时间银行与审计日志同步。</span>
            </div>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">验收重点</span>
              <span class="wb-list-desc">确保志愿者只能看到可接任务或自己的任务，且状态变化可回放。</span>
            </div>
          </div>
        </div>
      </div>

      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 14px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">角色分布</span>
            <span class="wb-page-subtitle">用最轻量的方式说明社区内的志愿者结构。</span>
          </div>
        </div>
        <div class="wb-list">
          <div class="wb-list-item"><span class="wb-list-title">志愿者</span><el-tag type="success">{{ volunteerCount }}</el-tag></div>
          <div class="wb-list-item"><span class="wb-list-title">负责人</span><el-tag type="warning">{{ leaderCount }}</el-tag></div>
          <div class="wb-list-item"><span class="wb-list-title">管理员</span><el-tag type="danger">{{ adminCount }}</el-tag></div>
        </div>
      </div>
    </div>

    <div class="wb-filter-card" style="margin-bottom: 20px">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input v-model="keyword" placeholder="搜索姓名或手机号" :prefix-icon="Search" clearable />
        </el-col>
      </el-row>
    </div>

    <div class="wb-panel">
      <el-table :data="volunteers" stripe v-loading="loading">
        <el-table-column prop="name" label="姓名" width="150" />
        <el-table-column prop="phone" label="手机号" width="160" />
        <el-table-column label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : row.role === 'leader' ? 'warning' : 'success'">{{ roleText(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="community_id" label="社区 ID" width="120" />
        <el-table-column prop="created_at" label="加入时间" />
      </el-table>

      <div style="display: flex; justify-content: flex-end; margin-top: 18px">
        <el-pagination v-model:current-page="page" layout="total, prev, pager, next" :total="total" :page-size="pageSize" @current-change="fetchVolunteers" />
      </div>
    </div>
  </div>
</template>
