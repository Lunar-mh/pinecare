<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { bootstrapDemoScenario, getDashboardStats, getRecentActivities, getSystemEvidence } from '@/services'
import type { DashboardStats, SystemEvidenceBundle } from '@/services'
import { buildRiskItems, buildWorkbenchCards } from '@/view-models/workbench'

const dashboard = ref<DashboardStats>({ stats: [], recentActivities: [] })
const evidence = ref<SystemEvidenceBundle | null>(null)
const loading = ref(true)
const bootstrapLoading = ref(false)

const cards = computed(() => buildWorkbenchCards(dashboard.value.stats || []))
const risks = computed(() => buildRiskItems(dashboard.value.recentActivities || []))
const recentActivities = computed(() => dashboard.value.recentActivities || [])
const providerRows = computed(() => (evidence.value?.providerEvidence || []).slice(0, 6))
const defenseScripts = computed(() => evidence.value?.defenseScripts || [])

function statusTagType(status: string): string {
  if (status.includes('正常') || status.includes('完成')) return 'success'
  if (status.includes('待') || status.includes('审核')) return 'warning'
  if (status.includes('SOS') || status.includes('异常')) return 'danger'
  return 'info'
}

function providerTagType(mode?: string): 'success' | 'warning' | 'info' | 'danger' {
  if (mode === 'live') return 'success'
  if (mode === 'stub') return 'warning'
  return 'info'
}

async function fetchDashboard() {
  loading.value = true
  try {
    const [stats, activities, evidenceBundle] = await Promise.all([
      getDashboardStats(),
      getRecentActivities(8),
      getSystemEvidence(),
    ])
    dashboard.value = {
      stats: stats.stats || [],
      recentActivities: activities || [],
    }
    evidence.value = evidenceBundle
  } catch (error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '工作台数据加载失败')
  } finally {
    loading.value = false
  }
}

async function handleBootstrap() {
  bootstrapLoading.value = true
  try {
    const result = await bootstrapDemoScenario('competition-full-loop')
    ElMessage.success(`剧本已准备：${result.title}`)
    await fetchDashboard()
  } catch (error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '准备答辩剧本失败')
  } finally {
    bootstrapLoading.value = false
  }
}

onMounted(fetchDashboard)
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">今日态势总览</span>
        <span class="wb-page-subtitle">先看活跃、告警、待处理，再进入各业务页做细分操作。</span>
      </div>
      <div style="display:flex; gap:10px; align-items:center">
        <div class="wb-chip">值班建议：先处理 SOS 与离线异常</div>
        <el-button :icon="Refresh" @click="fetchDashboard">刷新</el-button>
        <el-button type="primary" :loading="bootstrapLoading" @click="handleBootstrap">准备整项答辩剧本</el-button>
      </div>
    </div>

    <div class="wb-metric-grid">
      <div v-for="card in cards" :key="card.label" class="wb-metric-card">
        <span class="wb-card-label">{{ card.label }}</span>
        <div class="wb-card-value">{{ card.value }}<small>{{ card.unit }}</small></div>
        <span class="wb-card-hint">{{ card.hint }}</span>
      </div>
    </div>

    <div class="wb-grid-2">
      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 14px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">高风险事项</span>
            <span class="wb-page-subtitle">把最需要先处理的事项放在最上方。</span>
          </div>
        </div>
        <div class="wb-list">
          <div v-for="item in risks" :key="item.title + item.description" class="wb-list-item">
            <div>
              <span class="wb-list-title">{{ item.title }}</span>
              <span class="wb-list-desc">{{ item.description }}</span>
            </div>
            <el-tag :type="item.level === '高优先' ? 'danger' : item.level === '跟进中' ? 'warning' : 'success'">{{ item.level }}</el-tag>
          </div>
        </div>
      </div>

      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 14px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">证据与运行态</span>
            <span class="wb-page-subtitle">直接展示第三方模式、准备度和答辩脚本状态。</span>
          </div>
        </div>
        <div class="wb-list">
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">运行模式</span>
              <span class="wb-list-desc">{{ evidence?.runtimeMode || 'unknown' }}</span>
            </div>
            <el-tag :type="evidence?.summary.liveHealthyCount ? 'success' : 'warning'">{{ evidence?.summary.liveHealthyCount || 0 }} live</el-tag>
          </div>
          <div class="wb-list-item" v-for="item in defenseScripts" :key="item.id">
            <div>
              <span class="wb-list-title">{{ item.title }}</span>
              <span class="wb-list-desc">{{ item.proof }}</span>
            </div>
            <el-tag :type="item.ready ? 'success' : 'warning'">{{ item.ready ? '已准备' : '待补证据' }}</el-tag>
          </div>
        </div>
      </div>
    </div>

    <div class="wb-grid-2" style="margin-top: 20px">
      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 14px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">第三方能力总览</span>
            <span class="wb-page-subtitle">优先看模式、最近成功和最近错误。</span>
          </div>
        </div>
        <el-table :data="providerRows" stripe v-loading="loading">
          <el-table-column prop="key" label="能力" min-width="150" />
          <el-table-column label="模式" width="110">
            <template #default="{ row }">
              <el-tag :type="providerTagType(row.effectiveMode)">{{ row.effectiveMode || 'unknown' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="lastSuccessAt" label="最近成功" min-width="180" />
          <el-table-column prop="lastError" label="最近错误" min-width="220" show-overflow-tooltip />
        </el-table>
      </div>

      <div class="wb-panel">
        <div class="wb-page-header" style="margin-bottom: 14px">
          <div>
            <span class="wb-page-title" style="font-size: 22px">待处理提醒</span>
            <span class="wb-page-subtitle">结合近期动态，快速判断下一步工作。</span>
          </div>
        </div>
        <div class="wb-list">
          <div class="wb-list-item" v-for="item in evidence?.checklist || []" :key="item.key">
            <div>
              <span class="wb-list-title">{{ item.key }}</span>
              <span class="wb-list-desc">{{ item.detail }}</span>
            </div>
            <el-tag :type="item.status === 'ready' ? 'success' : item.status === 'pending' ? 'info' : 'warning'">{{ item.status }}</el-tag>
          </div>
        </div>
      </div>
    </div>

    <div class="wb-panel" style="margin-top: 20px">
      <div class="wb-page-header" style="margin-bottom: 14px">
        <div>
          <span class="wb-page-title" style="font-size: 22px">近期动态</span>
          <span class="wb-page-subtitle">保留表格视图，便于继续下钻处理。</span>
        </div>
      </div>
      <el-table :data="recentActivities" stripe v-loading="loading">
        <template #empty>
          <div style="padding: 28px; text-align: center; color: var(--wb-text-soft)">
            {{ loading ? '加载中...' : '暂无近期动态' }}
          </div>
        </template>
        <el-table-column prop="type" label="事件类型" width="200" />
        <el-table-column prop="user" label="相关用户" width="160" />
        <el-table-column prop="time" label="时间" />
        <el-table-column label="状态" width="140">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
