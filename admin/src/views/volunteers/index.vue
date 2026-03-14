<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getCommunityVolunteers } from '@/services'
import { usePagination } from '@/composables/usePagination'
import { formatTime, formatUser } from '@/utils/format'
import type { CommunityVolunteerItem } from '@/services'

const keyword = ref('')
const roleFilter = ref<'admin' | 'leader' | 'volunteer' | ''>('')
const detailVisible = ref(false)
const selected = ref<CommunityVolunteerItem | null>(null)

const {
  page,
  pageSize,
  total,
  list,
  loading,
  loadData,
} = usePagination<CommunityVolunteerItem>(getCommunityVolunteers, 10)

const filtered = computed(() => {
  if (!roleFilter.value) return list.value
  return list.value.filter((item) => item.role === roleFilter.value)
})

const roleCount = computed(() => {
  return {
    admin: list.value.filter((item) => item.role === 'admin').length,
    leader: list.value.filter((item) => item.role === 'leader').length,
    volunteer: list.value.filter((item) => item.role === 'volunteer').length,
  }
})

function roleText(role: string): string {
  if (role === 'admin') return '管理员'
  if (role === 'leader') return '负责人'
  return '志愿者'
}

function roleTagType(role: string): 'danger' | 'warning' | 'success' {
  if (role === 'admin') return 'danger'
  if (role === 'leader') return 'warning'
  return 'success'
}

async function fetchVolunteers(): Promise<void> {
  try {
    await loadData({ keyword: keyword.value || undefined })
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '志愿者列表加载失败')
  }
}

function openDetail(item: CommunityVolunteerItem): void {
  selected.value = item
  detailVisible.value = true
}

function copyPhone(phone: string): void {
  void navigator.clipboard?.writeText(phone)
  ElMessage.success(`已复制手机号：${phone}`)
}

watch(keyword, () => {
  page.value = 1
  void fetchVolunteers()
})

onMounted(() => {
  void fetchVolunteers()
})
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">志愿者管理</span>
        <span class="wb-page-subtitle">花名册、角色分布与联系方式统一管理，所有操作直接联动真实接口。</span>
      </div>
      <el-button :icon="Refresh" @click="fetchVolunteers">刷新名单</el-button>
    </div>

    <div class="wb-metric-grid">
      <div class="wb-metric-card">
        <span class="wb-card-label">志愿者总数</span>
        <div class="wb-card-value">{{ total }}</div>
        <span class="wb-card-hint">当前查询条件下的总量</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">管理员</span>
        <div class="wb-card-value">{{ roleCount.admin }}</div>
        <span class="wb-card-hint">负责策略与审核</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">负责人</span>
        <div class="wb-card-value">{{ roleCount.leader }}</div>
        <span class="wb-card-hint">负责排班与带队</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">志愿者</span>
        <div class="wb-card-value">{{ roleCount.volunteer }}</div>
        <span class="wb-card-hint">执行一线服务任务</span>
      </div>
    </div>

    <div class="wb-filter-card" style="margin-bottom: 20px">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input v-model="keyword" placeholder="搜索姓名或手机号" :prefix-icon="Search" clearable />
        </el-col>
        <el-col :span="4">
          <el-select v-model="roleFilter" placeholder="角色筛选" clearable style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="负责人" value="leader" />
            <el-option label="志愿者" value="volunteer" />
          </el-select>
        </el-col>
      </el-row>
    </div>

    <div class="wb-panel">
      <el-table :data="filtered" stripe v-loading="loading">
        <template #empty>
          <div style="padding: 28px; text-align: center; color: var(--wb-text-soft)">
            {{ loading ? '加载中...' : '暂无志愿者数据' }}
          </div>
        </template>
        <el-table-column prop="id" label="记录ID" width="100" />
        <el-table-column label="姓名" width="150">
          <template #default="{ row }">{{ formatUser(row.name) }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="160" />
        <el-table-column label="角色" width="110">
          <template #default="{ row }">
            <el-tag :type="roleTagType(row.role)">{{ roleText(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="community_id" label="社区ID" width="110" />
        <el-table-column label="加入时间" min-width="180">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDetail(row)">详情</el-button>
            <el-button type="success" link @click="copyPhone(row.phone)">复制电话</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="display: flex; justify-content: flex-end; margin-top: 18px">
        <el-pagination
          v-model:current-page="page"
          layout="total, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          @current-change="fetchVolunteers"
        />
      </div>
    </div>

    <el-drawer v-model="detailVisible" title="志愿者详情" size="420px">
      <template v-if="selected">
        <div class="wb-list">
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">基础信息</span>
              <span class="wb-list-desc">{{ formatUser(selected.name) }} / {{ selected.phone }}</span>
            </div>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">角色</span>
              <span class="wb-list-desc">{{ roleText(selected.role) }}</span>
            </div>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">社区与加入时间</span>
              <span class="wb-list-desc">社区 {{ selected.community_id }} / {{ formatTime(selected.created_at) }}</span>
            </div>
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

