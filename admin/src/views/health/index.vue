<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { getAdminHealthOverview } from '@/services'
import { usePagination } from '@/composables/usePagination'
import type { AdminHealthOverviewItem } from '@/services'

const search = ref('')

const {
  page,
  pageSize,
  total,
  list,
  loading,
  loadData,
} = usePagination<AdminHealthOverviewItem>(getAdminHealthOverview, 10)

const warningCount = computed(() => list.value.filter(item => item.riskLevel === 'warning').length)
const dangerCount = computed(() => list.value.filter(item => item.riskLevel === 'danger').length)

async function fetchHealthOverview() {
  try {
    await loadData({ search: search.value || undefined })
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load health overview')
  }
}

watch(search, () => {
  page.value = 1
  fetchHealthOverview()
})
onMounted(fetchHealthOverview)
</script>

<template>
  <div>
    <div class="wb-page-header"><div><span class="wb-page-title">健康总览</span><span class="wb-page-subtitle">聚焦高风险用户、最近更新和关键指标，便于运营快速判断。</span></div><el-button :icon="Refresh" @click="fetchHealthOverview">刷新</el-button></div>
    <div class="wb-metric-grid">
      <div class="wb-metric-card"><span class="wb-card-label">总用户</span><div class="wb-card-value">{{ total }}</div><span class="wb-card-hint">当前检索结果</span></div>
      <div class="wb-metric-card"><span class="wb-card-label">预警</span><div class="wb-card-value">{{ warningCount }}</div><span class="wb-card-hint">建议跟进</span></div>
      <div class="wb-metric-card"><span class="wb-card-label">高风险</span><div class="wb-card-value">{{ dangerCount }}</div><span class="wb-card-hint">优先处理</span></div>
    </div>
    <div class="wb-filter-card"><el-input v-model="search" :prefix-icon="Search" placeholder="搜索用户昵称或手机号" clearable style="max-width:320px" /></div>
    <div class="wb-panel"><el-table :data="list" stripe v-loading="loading"><el-table-column prop="userId" label="用户ID" width="100" /><el-table-column prop="nickname" label="昵称" width="130" /><el-table-column prop="phone" label="手机号" width="150" /><el-table-column prop="age" label="年龄" width="90" /><el-table-column prop="bloodPressure" label="血压" width="130" /><el-table-column prop="heartRate" label="心率" width="120" /><el-table-column prop="bloodSugar" label="血糖" width="120" /><el-table-column label="风险" width="100"><template #default="{ row }"><el-tag :type="row.riskLevel === 'danger' ? 'danger' : row.riskLevel === 'warning' ? 'warning' : 'success'">{{ row.riskLevel }}</el-tag></template></el-table-column><el-table-column prop="lastUpdate" label="最近更新" min-width="170" /></el-table><div style="display:flex; justify-content:flex-end; margin-top:16px"><el-pagination v-model:current-page="page" layout="total, prev, pager, next" :total="total" :page-size="pageSize" @current-change="fetchHealthOverview" /></div></div>
  </div>
</template>
