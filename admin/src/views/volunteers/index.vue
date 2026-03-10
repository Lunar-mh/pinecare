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
const adminCount = computed(() => volunteers.value.filter(item => item.role === 'admin').length)
const leaderCount = computed(() => volunteers.value.filter(item => item.role === 'leader').length)

function roleText(role: string): string {
  if (role === 'admin') return '管理员'
  if (role === 'leader') return '组长'
  return '志愿者'
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
    const message = err instanceof Error ? err.message : '加载志愿者失败'
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
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">志愿者管理</span>
        <span class="wb-page-subtitle">围绕角色、社区归属和加入时间管理志愿者资源。</span>
      </div>
      <el-button type="primary" :icon="Refresh" round @click="fetchVolunteers">刷新列表</el-button>
    </div>

    <div class="wb-metric-grid">
      <div class="wb-metric-card">
        <span class="wb-card-label">志愿者总数</span>
        <div class="wb-card-value">{{ total }}</div>
        <span class="wb-card-hint">当前查询范围内的数据</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">管理员</span>
        <div class="wb-card-value">{{ adminCount }}</div>
        <span class="wb-card-hint">负责配置与审批</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">组长</span>
        <div class="wb-card-value">{{ leaderCount }}</div>
        <span class="wb-card-hint">负责调度与跟进</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">本页条目</span>
        <div class="wb-card-value">{{ pageCount }}</div>
        <span class="wb-card-hint">方便快速核对加载结果</span>
      </div>
    </div>

    <div class="wb-filter-card" style="margin-bottom: 20px">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input v-model="keyword" placeholder="按姓名或手机号搜索" :prefix-icon="Search" clearable />
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
