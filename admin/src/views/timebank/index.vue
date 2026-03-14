<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { confirmTimeBankService, getTimeBankExchangeHistory, getTimeBankLeaderboard, getTimeBankServiceHistory } from '@/services'
import type { TimeBankExchangeRecord, TimeBankLeaderboardItem, TimeBankServiceRecord } from '@/services'
import { usePagination } from '@/composables/usePagination'

const activeTab = ref<'services' | 'exchange' | 'leaderboard'>('services')
const serviceStatus = ref<'pending' | 'confirmed' | 'cancelled' | ''>('')
const serviceSearch = ref('')
const exchanges = ref<TimeBankExchangeRecord[]>([])
const leaderboard = ref<TimeBankLeaderboardItem[]>([])
const actionLoadingId = ref<number | null>(null)

const {
  page: servicePage,
  pageSize: servicePageSize,
  total: serviceTotal,
  list: serviceRecords,
  loading: serviceLoading,
  loadData: loadServiceData
} = usePagination<TimeBankServiceRecord>(getTimeBankServiceHistory)

const pendingServiceCount = computed(() => serviceRecords.value.filter(item => item.status === 'pending').length)
const confirmedServiceCoins = computed(() => serviceRecords.value.filter(item => item.status === 'confirmed').reduce((sum, item) => sum + Number(item.timeCoins || 0), 0))
const exchangeCount = computed(() => exchanges.value.length)
const topBalance = computed(() => leaderboard.value[0]?.balance || 0)
function serviceTypeLabel(value: string): string {
  if (value === 'escort') return '陪诊陪护'
  if (value === 'visit') return '探访关怀'
  if (value === 'rehabilitation') return '康复协助'
  if (value === 'shopping') return '代购代办'
  if (value === 'medication-support') return '用药协助'
  return value || '-'
}

function exchangeTypeLabel(value: string): string {
  if (value === 'redeem') return '权益兑换'
  if (value === 'transfer') return '转赠'
  if (value === 'consume') return '消费'
  return value || '-'
}

function creditLevelLabel(value: string): string {
  if (value === 'angel') return '天使'
  if (value === 'gold') return '金牌'
  if (value === 'silver') return '银牌'
  if (value === 'new') return '新星'
  return value || '-'
}

function statusLabel(value: string): string {
  if (value === 'confirmed') return '已确认'
  if (value === 'cancelled') return '已取消'
  return '待审核'
}

function statusTagType(value: string): 'success' | 'warning' | 'info' {
  if (value === 'confirmed') return 'success'
  if (value === 'cancelled') return 'info'
  return 'warning'
}

async function fetchServiceHistory() {
  try {
    await loadServiceData({
      type: 'provided',
      status: serviceStatus.value || undefined,
      search: serviceSearch.value || undefined,
    })
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '服务记录加载失败')
  }
}

async function fetchExchangeHistory() {
  try {
    exchanges.value = await getTimeBankExchangeHistory()
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '兑换记录加载失败')
    exchanges.value = []
  }
}

async function fetchLeaderboard() {
  try {
    leaderboard.value = await getTimeBankLeaderboard()
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '排行榜加载失败')
    leaderboard.value = []
  }
}

async function fetchAll() {
  await Promise.all([fetchServiceHistory(), fetchExchangeHistory(), fetchLeaderboard()])
}

async function handleAction(record: TimeBankServiceRecord, action: 'confirm' | 'cancel') {
  actionLoadingId.value = record.id
  try {
    await confirmTimeBankService(record.id, action)
    ElMessage.success(action === 'confirm' ? '服务记录已确认' : '服务记录已取消')
    await fetchServiceHistory()
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '时间银行操作失败')
  } finally {
    actionLoadingId.value = null
  }
}

watch([serviceStatus, serviceSearch], () => {
  servicePage.value = 1
  fetchServiceHistory()
})

watch(activeTab, (value) => {
  if (value === 'services') fetchServiceHistory()
  if (value === 'exchange') fetchExchangeHistory()
  if (value === 'leaderboard') fetchLeaderboard()
})

onMounted(fetchAll)
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">时间银行</span>
        <span class="wb-page-subtitle">把服务记录、兑换履约和贡献排名放在一套协同视图里，方便社区看清服务流转效率。</span>
      </div>
      <el-button :icon="Refresh" @click="fetchAll">刷新数据</el-button>
    </div>

    <div class="wb-metric-grid">
      <div class="wb-metric-card">
        <span class="wb-card-label">服务记录</span>
        <div class="wb-card-value">{{ serviceTotal }}</div>
        <span class="wb-card-hint">当前筛选下的服务履约记录</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">待审核</span>
        <div class="wb-card-value">{{ pendingServiceCount }}</div>
        <span class="wb-card-hint">建议值班人员优先确认</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">已确认时长币</span>
        <div class="wb-card-value">{{ confirmedServiceCoins }}</div>
        <span class="wb-card-hint">反映本期已沉淀服务贡献</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">榜首余额</span>
        <div class="wb-card-value">{{ topBalance }}</div>
        <span class="wb-card-hint">用于观察激励强度</span>
      </div>
    </div>

    <div class="wb-panel">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="服务履约" name="services">
          <div class="wb-filter-card" style="margin-bottom: 16px">
            <el-row :gutter="12" align="middle">
              <el-col :span="6">
                <el-input v-model="serviceSearch" :prefix-icon="Search" placeholder="搜索服务人、被服务人或类型" clearable />
              </el-col>
              <el-col :span="4">
                <el-select v-model="serviceStatus" placeholder="审核状态" clearable style="width: 100%">
                  <el-option label="待审核" value="pending" />
                  <el-option label="已确认" value="confirmed" />
                  <el-option label="已取消" value="cancelled" />
                </el-select>
              </el-col>
              <el-col :span="14" style="display: flex; justify-content: flex-end">
                <span class="wb-chip">优先处理待审核记录，避免时长结算滞后</span>
              </el-col>
            </el-row>
          </div>

          <el-table :data="serviceRecords" stripe v-loading="serviceLoading">
            <template #empty>
              <div style="padding: 28px; text-align: center; color: var(--wb-text-soft)">
                {{ serviceLoading ? '加载中...' : '暂无服务履约记录' }}
              </div>
            </template>
            <el-table-column prop="id" label="记录 ID" width="100" />
            <el-table-column label="服务提供者" min-width="150">
              <template #default="{ row }">
                <div>{{ row.providerName || `用户 #${row.providerId}` }}</div>
                <div style="font-size: 12px; color: var(--wb-text-soft); margin-top: 4px">提供者 ID {{ row.providerId }}</div>
              </template>
            </el-table-column>
            <el-table-column label="服务对象" min-width="150">
              <template #default="{ row }">
                <div>{{ row.recipientName || `用户 #${row.recipientId}` }}</div>
                <div style="font-size: 12px; color: var(--wb-text-soft); margin-top: 4px">对象 ID {{ row.recipientId }}</div>
              </template>
            </el-table-column>
            <el-table-column label="服务类型" width="140"><template #default="{ row }">{{ serviceTypeLabel(row.serviceType) }}</template></el-table-column>
            <el-table-column prop="durationHours" label="时长" width="90" />
            <el-table-column prop="timeCoins" label="时长币" width="90" />
            <el-table-column prop="startTime" label="开始时间" width="180" />
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="170" fixed="right">
              <template #default="{ row }">
                <template v-if="row.status === 'pending'">
                  <el-button type="success" link :loading="actionLoadingId === row.id" @click="handleAction(row, 'confirm')">确认</el-button>
                  <el-button type="danger" link :loading="actionLoadingId === row.id" @click="handleAction(row, 'cancel')">取消</el-button>
                </template>
                <span v-else style="color: var(--wb-text-soft)">已处理</span>
              </template>
            </el-table-column>
          </el-table>
          <div style="display: flex; justify-content: flex-end; margin-top: 16px">
            <el-pagination
              v-model:current-page="servicePage"
              layout="total, prev, pager, next"
              :total="serviceTotal"
              :page-size="servicePageSize"
              @current-change="fetchServiceHistory"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane :label="`兑换记录 (${exchangeCount})`" name="exchange">
          <el-table :data="exchanges" stripe>
            <template #empty>
              <div style="padding: 28px; text-align: center; color: var(--wb-text-soft)">暂无兑换记录</div>
            </template>
            <el-table-column prop="id" label="兑换 ID" width="100" />
            <el-table-column prop="userId" label="用户 ID" width="100" />
            <el-table-column label="兑换类型" width="140"><template #default="{ row }">{{ exchangeTypeLabel(row.exchangeType) }}</template></el-table-column>
            <el-table-column prop="itemName" label="兑换项" min-width="180" />
            <el-table-column prop="coinsRequired" label="所需时长币" width="110" />
            <el-table-column label="状态" width="120"><template #default="{ row }">{{ statusLabel(row.status) }}</template></el-table-column>
            <el-table-column prop="createdAt" label="申请时间" width="180" />
            <el-table-column prop="completedAt" label="完成时间" width="180" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="贡献榜单" name="leaderboard">
          <el-table :data="leaderboard" stripe>
            <template #empty>
              <div style="padding: 28px; text-align: center; color: var(--wb-text-soft)">暂无榜单数据</div>
            </template>
            <el-table-column prop="rank" label="名次" width="80" />
            <el-table-column prop="userId" label="用户 ID" width="100" />
            <el-table-column prop="balance" label="余额" width="110" />
            <el-table-column prop="totalEarned" label="累计获得" width="130" />
            <el-table-column prop="creditScore" label="信用分" width="110" />
            <el-table-column label="信用等级" width="120"><template #default="{ row }">{{ creditLevelLabel(row.creditLevel) }}</template></el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>
