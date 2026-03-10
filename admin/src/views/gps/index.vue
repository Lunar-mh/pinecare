<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
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

const selectedUser = computed(() => currentList.value.find(item => item.userId === selectedUserId.value) || null)
const preciseCount = computed(() => currentList.value.filter(item => (item.accuracy || 9999) <= 50).length)
const trailPoints = computed(() => trail.value.length)

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
    if (!selectedUserId.value && currentList.value.length > 0) {
      selectedUserId.value = currentList.value[0]?.userId ?? null
    }
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '定位列表加载失败')
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
      limit: 500,
    })
    trail.value = data.list || []
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '轨迹数据加载失败')
    trail.value = []
  } finally {
    trailLoading.value = false
  }
}

function handleSelectUser(row: AdminGpsCurrentItem) {
  selectedUserId.value = row.userId
}

watch(search, () => {
  page.value = 1
  fetchCurrentList()
})

watch(selectedUserId, () => {
  fetchTrail()
})

onMounted(async () => {
  initRange()
  await fetchCurrentList()
  await fetchTrail()
})
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">定位守护</span>
        <span class="wb-page-subtitle">当前定位、定位精度和历史轨迹集中在一页，方便值班人员快速判断是否需要联系家属。</span>
      </div>
      <el-button :icon="Refresh" @click="fetchCurrentList">刷新定位</el-button>
    </div>

    <div class="wb-metric-grid">
      <div class="wb-metric-card">
        <span class="wb-card-label">在线对象</span>
        <div class="wb-card-value">{{ total }}</div>
        <span class="wb-card-hint">具备当前位置上报的老人数量</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">高精度定位</span>
        <div class="wb-card-value">{{ preciseCount }}</div>
        <span class="wb-card-hint">精度 50 米以内，更适合异常判断</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">已选对象</span>
        <div class="wb-card-value">{{ selectedUser ? selectedUser.nickname : '-' }}</div>
        <span class="wb-card-hint">点击列表可切换轨迹对象</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">轨迹点数</span>
        <div class="wb-card-value">{{ trailPoints }}</div>
        <span class="wb-card-hint">当前时间范围内的轨迹采样点</span>
      </div>
    </div>

    <div class="wb-filter-card" style="margin-bottom: 20px">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input v-model="search" :prefix-icon="Search" placeholder="搜索老人、手机号或用户 ID" clearable />
        </el-col>
        <el-col :span="10">
          <el-date-picker
            v-model="range"
            type="datetimerange"
            value-format="YYYY-MM-DD HH:mm:ss"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 100%"
          />
        </el-col>
        <el-col :span="6" style="display: flex; justify-content: flex-end; gap: 10px">
          <el-button @click="fetchTrail">查询轨迹</el-button>
          <span class="wb-chip">优先关注长时间未更新或轨迹异常偏移</span>
        </el-col>
      </el-row>
    </div>

    <div class="wb-grid-2">
      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 14px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">当前定位列表</span>
            <span class="wb-page-subtitle">点击任意对象即可在右侧查看轨迹摘要。</span>
          </div>
        </div>
        <el-table :data="currentList" stripe v-loading="loading" @row-click="handleSelectUser">
          <template #empty>
            <div style="padding: 28px; text-align: center; color: var(--wb-text-soft)">
              {{ loading ? '加载中...' : '暂无定位数据' }}
            </div>
          </template>
          <el-table-column prop="userId" label="用户 ID" width="100" />
          <el-table-column label="关注对象" min-width="160">
            <template #default="{ row }">
              <div>{{ row.nickname }}</div>
              <div style="font-size: 12px; color: var(--wb-text-soft); margin-top: 4px">{{ row.phone }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="latitude" label="纬度" width="120" />
          <el-table-column prop="longitude" label="经度" width="120" />
          <el-table-column label="精度" width="100">
            <template #default="{ row }">{{ row.accuracy ?? '-' }}</template>
          </el-table-column>
          <el-table-column prop="updatedAt" label="更新时间" width="180" />
        </el-table>
        <div style="display: flex; justify-content: flex-end; margin-top: 16px">
          <el-pagination
            v-model:current-page="page"
            layout="total, prev, pager, next"
            :total="total"
            :page-size="pageSize"
            @current-change="fetchCurrentList"
          />
        </div>
      </div>

      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 14px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">轨迹摘要</span>
            <span class="wb-page-subtitle">用于快速判断老人是否偏离熟悉路径或出现长时间停留。</span>
          </div>
        </div>
        <div class="wb-list" style="margin-bottom: 16px">
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">当前对象</span>
              <span class="wb-list-desc">{{ selectedUser ? `${selectedUser.nickname} / ${selectedUser.phone}` : '请先从左侧选择对象' }}</span>
            </div>
            <el-tag v-if="selectedUser" type="success">{{ selectedUser.locationType }}</el-tag>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">当前位置</span>
              <span class="wb-list-desc">{{ selectedUser ? `${selectedUser.latitude}, ${selectedUser.longitude}` : '-' }}</span>
            </div>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">轨迹时间窗</span>
              <span class="wb-list-desc">{{ range[0] }} 至 {{ range[1] }}</span>
            </div>
          </div>
        </div>
        <el-table :data="trail" stripe v-loading="trailLoading" max-height="480">
          <template #empty>
            <div style="padding: 28px; text-align: center; color: var(--wb-text-soft)">
              {{ trailLoading ? '加载中...' : '当前时间范围暂无轨迹点' }}
            </div>
          </template>
          <el-table-column prop="createdAt" label="时间" width="180" />
          <el-table-column prop="latitude" label="纬度" width="120" />
          <el-table-column prop="longitude" label="经度" width="120" />
          <el-table-column label="精度" width="100">
            <template #default="{ row }">{{ row.accuracy ?? '-' }}</template>
          </el-table-column>
          <el-table-column prop="locationType" label="类型" width="120" />
        </el-table>
      </div>
    </div>
  </div>
</template>