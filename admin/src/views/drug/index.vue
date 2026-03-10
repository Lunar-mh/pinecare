<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { acknowledgeDrugInteraction, getDrugInteractionHistory } from '@/services'
import type { DrugInteractionRecord, DrugRecordStatus, DrugRiskLevel } from '@/services'

const loading = ref(false)
const actionLoadingId = ref<number | null>(null)
const keyword = ref('')
const statusFilter = ref<DrugRecordStatus | ''>('')
const selected = ref<DrugInteractionRecord | null>(null)
const drawerVisible = ref(false)
const records = ref<DrugInteractionRecord[]>([])

const filteredRecords = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return records.value
  return records.value.filter(item => {
    return [item.userName, item.userPhone, item.drugA, item.drugB, item.riskDescription, item.suggestion]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(text))
  })
})

const totalCount = computed(() => records.value.length)
const pendingCount = computed(() => records.value.filter(item => item.status === 'pending').length)
const highRiskCount = computed(() => records.value.filter(item => item.level === 'high').length)
const acknowledgedCount = computed(() => records.value.filter(item => item.status === 'acknowledged').length)

function levelLabel(level: DrugRiskLevel): string {
  if (level === 'high') return '高风险'
  if (level === 'medium') return '中风险'
  return '低风险'
}

function levelTagType(level: DrugRiskLevel): 'danger' | 'warning' | 'success' {
  if (level === 'high') return 'danger'
  if (level === 'medium') return 'warning'
  return 'success'
}

function statusLabel(status: DrugRecordStatus): string {
  return status === 'acknowledged' ? '已知悉' : '待处理'
}

async function fetchRecords() {
  loading.value = true
  try {
    records.value = await getDrugInteractionHistory(statusFilter.value || undefined)
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '药物风险记录加载失败')
    records.value = []
  } finally {
    loading.value = false
  }
}

async function handleAcknowledge(record: DrugInteractionRecord) {
  actionLoadingId.value = record.id
  try {
    await acknowledgeDrugInteraction(record.id)
    ElMessage.success('已标记为知悉')
    await fetchRecords()
    if (selected.value?.id === record.id) {
      selected.value = records.value.find(item => item.id === record.id) || null
    }
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '知悉操作失败')
  } finally {
    actionLoadingId.value = null
  }
}

function handleInspect(record: DrugInteractionRecord) {
  selected.value = record
  drawerVisible.value = true
}

watch(statusFilter, fetchRecords)
onMounted(fetchRecords)
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">药物相互作用</span>
        <span class="wb-page-subtitle">把高风险组合、说明建议和处理状态集中在一个风险工作台里，方便值班人员快速知悉与跟进。</span>
      </div>
      <el-button :icon="Refresh" @click="fetchRecords">刷新列表</el-button>
    </div>

    <div class="wb-metric-grid">
      <div class="wb-metric-card">
        <span class="wb-card-label">当前记录</span>
        <div class="wb-card-value">{{ totalCount }}</div>
        <span class="wb-card-hint">当前筛选条件下的风险结果</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">高风险组合</span>
        <div class="wb-card-value">{{ highRiskCount }}</div>
        <span class="wb-card-hint">建议优先触达家属或护理人员</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">待处理</span>
        <div class="wb-card-value">{{ pendingCount }}</div>
        <span class="wb-card-hint">尚未确认的风险提示</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">已知悉</span>
        <div class="wb-card-value">{{ acknowledgedCount }}</div>
        <span class="wb-card-hint">已完成值班确认</span>
      </div>
    </div>

    <div class="wb-filter-card" style="margin-bottom: 20px">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input v-model="keyword" :prefix-icon="Search" placeholder="搜索老人、手机号、药品或建议" clearable />
        </el-col>
        <el-col :span="5">
          <el-select v-model="statusFilter" placeholder="处理状态" clearable style="width: 100%">
            <el-option label="待处理" value="pending" />
            <el-option label="已知悉" value="acknowledged" />
          </el-select>
        </el-col>
        <el-col :span="11" style="display: flex; justify-content: flex-end">
          <span class="wb-chip">先处理高风险且仍待处理的组合</span>
        </el-col>
      </el-row>
    </div>

    <div class="wb-panel">
      <div class="wb-page-header" style="margin-bottom: 14px">
        <div>
          <span class="wb-page-title" style="font-size: 22px">风险明细</span>
          <span class="wb-page-subtitle">保留一张可直接操作的明细表，便于药师或运营人员立即落处理动作。</span>
        </div>
      </div>
      <el-table :data="filteredRecords" stripe v-loading="loading">
        <template #empty>
          <div style="padding: 28px; text-align: center; color: var(--wb-text-soft)">
            {{ loading ? '加载中...' : '暂无药物风险记录' }}
          </div>
        </template>
        <el-table-column label="关注对象" min-width="160">
          <template #default="{ row }">
            <div>{{ row.userName || `用户 #${row.userId}` }}</div>
            <div style="font-size: 12px; color: var(--wb-text-soft); margin-top: 4px">{{ row.userPhone || `批次 ${row.checkBatchId}` }}</div>
          </template>
        </el-table-column>
        <el-table-column label="药物组合" min-width="170">
          <template #default="{ row }">
            <div>{{ row.drugA }}</div>
            <div style="font-size: 12px; color: var(--wb-text-soft); margin-top: 4px">{{ row.drugB }}</div>
          </template>
        </el-table-column>
        <el-table-column label="风险级别" width="110">
          <template #default="{ row }">
            <el-tag :type="levelTagType(row.level)">{{ levelLabel(row.level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="mechanism" label="作用机制" min-width="180" show-overflow-tooltip />
        <el-table-column prop="riskDescription" label="风险说明" min-width="220" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="发现时间" width="180" />
        <el-table-column label="处理状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.status === 'acknowledged' ? 'success' : 'warning'">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleInspect(row)">查看详情</el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="warning"
              link
              :loading="actionLoadingId === row.id"
              @click="handleAcknowledge(row)"
            >
              标记知悉
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-drawer v-model="drawerVisible" size="460px" :title="selected ? `${selected.drugA} + ${selected.drugB}` : '风险详情'">
      <template v-if="selected">
        <div class="wb-list">
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">风险等级</span>
              <span class="wb-list-desc">{{ levelLabel(selected.level) }}，建议按高优先级进行外呼或复核。</span>
            </div>
            <el-tag :type="levelTagType(selected.level)">{{ levelLabel(selected.level) }}</el-tag>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">作用机制</span>
              <span class="wb-list-desc">{{ selected.mechanism }}</span>
            </div>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">风险说明</span>
              <span class="wb-list-desc">{{ selected.riskDescription }}</span>
            </div>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">处理建议</span>
              <span class="wb-list-desc">{{ selected.suggestion }}</span>
            </div>
          </div>
        </div>
        <div style="margin-top: 20px; display: flex; justify-content: flex-end">
          <el-button
            v-if="selected.status === 'pending'"
            type="primary"
            :loading="actionLoadingId === selected.id"
            @click="handleAcknowledge(selected)"
          >
            标记已知悉
          </el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>
