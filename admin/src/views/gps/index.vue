<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { bootstrapDemoScenario, getAdminGpsCurrent, getAdminGpsTrail, getSystemEventReplay } from '@/services'
import type { AdminGpsCurrentItem, GpsTrailItem, SystemEventReplay } from '@/services'

const loading = ref(false)
const trailLoading = ref(false)
const bootstrapLoading = ref(false)
const replayLoading = ref(false)
const search = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const currentList = ref<AdminGpsCurrentItem[]>([])
const selectedUserId = ref<number | null>(null)
const trail = ref<GpsTrailItem[]>([])
const replay = ref<SystemEventReplay | null>(null)
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
    ElMessage.error(err instanceof Error ? err.message : 'GPS 数据加载失败')
    currentList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function fetchTrail() {
  if (!selectedUserId.value || !range.value[0] || !range.value[1]) {
    trail.value = []
    replay.value = null
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
    ElMessage.error(err instanceof Error ? err.message : '轨迹加载失败')
    trail.value = []
  } finally {
    trailLoading.value = false
  }
}

async function fetchReplay() {
  if (!selectedUserId.value || !range.value[0] || !range.value[1]) {
    replay.value = null
    return
  }

  replayLoading.value = true
  try {
    replay.value = await getSystemEventReplay({
      userId: selectedUserId.value,
      startDate: range.value[0],
      endDate: range.value[1],
    })
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '事件复盘加载失败')
    replay.value = null
  } finally {
    replayLoading.value = false
  }
}

function handleSelectUser(row: AdminGpsCurrentItem) {
  selectedUserId.value = row.userId
}

async function handleBootstrap() {
  bootstrapLoading.value = true
  try {
    const result = await bootstrapDemoScenario('gps-fence-fall')
    ElMessage.success(`GPS/Fall 剧本已准备：${result.title}`)
    await fetchReplay()
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : 'GPS 剧本准备失败')
  } finally {
    bootstrapLoading.value = false
  }
}

watch(search, () => {
  page.value = 1
  fetchCurrentList()
})

watch(selectedUserId, async () => {
  await fetchTrail()
  await fetchReplay()
})

onMounted(async () => {
  initRange()
  await fetchCurrentList()
  await fetchTrail()
  await fetchReplay()
})
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">GPS 追踪</span>
        <span class="wb-page-subtitle">当前位置、轨迹和事件复盘放在同一页，答辩时可以直接按用户回放。</span>
      </div>
      <div style="display:flex; gap:10px">
        <el-button type="primary" :loading="bootstrapLoading" @click="handleBootstrap">准备 GPS 剧本</el-button>
        <el-button :icon="Refresh" @click="fetchCurrentList">刷新位置</el-button>
      </div>
    </div>

    <div class="wb-metric-grid">
      <div class="wb-metric-card">
        <span class="wb-card-label">位置总数</span>
        <div class="wb-card-value">{{ total }}</div>
        <span class="wb-card-hint">当前可见的最新位置记录</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">高精度定位</span>
        <div class="wb-card-value">{{ preciseCount }}</div>
        <span class="wb-card-hint">精度 50 米以内的定位数</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">当前选中</span>
        <div class="wb-card-value">{{ selectedUser ? selectedUser.nickname : '-' }}</div>
        <span class="wb-card-hint">切换用户后会自动刷新轨迹和复盘</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">轨迹点数</span>
        <div class="wb-card-value">{{ trailPoints }}</div>
        <span class="wb-card-hint">当前时间窗口内的轨迹条目</span>
      </div>
    </div>

    <div class="wb-filter-card" style="margin-bottom: 20px">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input v-model="search" :prefix-icon="Search" placeholder="搜索昵称、手机号或用户 ID" clearable />
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
          <el-button @click="fetchTrail">刷新轨迹</el-button>
          <el-button @click="fetchReplay">生成复盘</el-button>
        </el-col>
      </el-row>
    </div>

    <div class="wb-grid-2">
      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 14px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">当前位置列表</span>
            <span class="wb-page-subtitle">点击任一用户即可切换右侧轨迹和事件复盘。</span>
          </div>
        </div>
        <el-table :data="currentList" stripe v-loading="loading" @row-click="handleSelectUser">
          <template #empty>
            <div style="padding: 28px; text-align: center; color: var(--wb-text-soft)">
              {{ loading ? '加载中...' : '暂无定位数据' }}
            </div>
          </template>
          <el-table-column prop="userId" label="用户 ID" width="100" />
          <el-table-column label="用户" min-width="160">
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
            <span class="wb-page-title" style="font-size: 22px">轨迹与复盘摘要</span>
            <span class="wb-page-subtitle">位置轨迹和统一事件复盘在同一处展示。</span>
          </div>
        </div>
        <div class="wb-list" style="margin-bottom: 16px">
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">当前用户</span>
              <span class="wb-list-desc">{{ selectedUser ? `${selectedUser.nickname} / ${selectedUser.phone}` : '请先选择一位用户' }}</span>
            </div>
            <el-tag v-if="selectedUser" type="success">{{ selectedUser.locationType }}</el-tag>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">当前坐标</span>
              <span class="wb-list-desc">{{ selectedUser ? `${selectedUser.latitude}, ${selectedUser.longitude}` : '-' }}</span>
            </div>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">事件复盘</span>
              <span class="wb-list-desc">{{ replayLoading ? '复盘生成中...' : replay ? `告警 ${replay.summary.activeIncidents} · 失败投递 ${replay.summary.deliveryFailures}` : '当前没有复盘摘要' }}</span>
            </div>
          </div>
        </div>
        <div class="wb-list" v-if="replay">
          <div class="wb-list-item" v-for="item in replay.recommendations" :key="item">
            <div>
              <span class="wb-list-title">复盘建议</span>
              <span class="wb-list-desc">{{ item }}</span>
            </div>
          </div>
        </div>
        <el-table :data="trail" stripe v-loading="trailLoading" max-height="320" style="margin-top: 16px">
          <template #empty>
            <div style="padding: 28px; text-align: center; color: var(--wb-text-soft)">
              {{ trailLoading ? '加载中...' : '当前时间范围没有轨迹数据' }}
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
