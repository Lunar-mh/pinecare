<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  getTimeBankLeaderboard,
  getTimeBankServiceHistory,
  confirmTimeBankService,
  getTimeBankExchangeHistory,
} from '@/services'
import type {
  TimeBankLeaderboardItem,
  TimeBankServiceRecord,
  TimeBankExchangeRecord,
} from '@/services'

const loading = ref(false)
const activeTab = ref<'services' | 'exchange' | 'leaderboard'>('services')

const serviceRecords = ref<TimeBankServiceRecord[]>([])
const serviceTotal = ref(0)
const servicePage = ref(1)
const servicePageSize = ref(10)

const exchanges = ref<TimeBankExchangeRecord[]>([])
const leaderboard = ref<TimeBankLeaderboardItem[]>([])

const pendingServiceCount = computed(
  () => serviceRecords.value.filter((item) => item.status === 'pending').length
)
const confirmedServiceCoins = computed(() =>
  serviceRecords.value
    .filter((item) => item.status === 'confirmed')
    .reduce((sum, item) => sum + Number(item.timeCoins || 0), 0)
)

async function fetchServiceHistory() {
  loading.value = true
  try {
    const data = await getTimeBankServiceHistory({
      page: servicePage.value,
      pageSize: servicePageSize.value,
      type: 'provided',
    })
    serviceRecords.value = data.list || []
    serviceTotal.value = data.pagination?.total || 0
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load service history.'
    ElMessage.error(message)
    serviceRecords.value = []
    serviceTotal.value = 0
  } finally {
    loading.value = false
  }
}

async function fetchExchangeHistory() {
  try {
    exchanges.value = await getTimeBankExchangeHistory()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load exchange history.'
    ElMessage.error(message)
    exchanges.value = []
  }
}

async function fetchLeaderboard() {
  try {
    leaderboard.value = await getTimeBankLeaderboard()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load leaderboard.'
    ElMessage.error(message)
    leaderboard.value = []
  }
}

async function fetchAll() {
  await Promise.all([fetchServiceHistory(), fetchExchangeHistory(), fetchLeaderboard()])
}

async function handleConfirm(row: TimeBankServiceRecord) {
  try {
    await confirmTimeBankService(row.id, 'confirm')
    ElMessage.success('Service record confirmed.')
    await fetchServiceHistory()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Confirm failed.'
    ElMessage.error(message)
  }
}

async function handleCancel(row: TimeBankServiceRecord) {
  try {
    await confirmTimeBankService(row.id, 'cancel')
    ElMessage.success('Service record cancelled.')
    await fetchServiceHistory()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cancel failed.'
    ElMessage.error(message)
  }
}

watch(activeTab, (tab) => {
  if (tab === 'services') fetchServiceHistory()
  if (tab === 'exchange') fetchExchangeHistory()
  if (tab === 'leaderboard') fetchLeaderboard()
})

onMounted(fetchAll)
</script>

<template>
  <div class="timebank-page">
    <div class="page-header">
      <span class="page-title">Time Bank</span>
      <el-button :icon="Refresh" @click="fetchAll">Refresh</el-button>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #01579b">{{ serviceTotal }}</div>
          <div class="stat-label">Service Records</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #f57c00">{{ pendingServiceCount }}</div>
          <div class="stat-label">Pending Review</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #2e7d32">{{ confirmedServiceCoins }}</div>
          <div class="stat-label">Confirmed Coins</div>
        </div>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="Service Records" name="services">
        <el-card class="table-card">
          <el-table :data="serviceRecords" stripe style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="Record ID" width="100" />
            <el-table-column prop="providerId" label="Provider" width="110" />
            <el-table-column prop="recipientId" label="Recipient" width="110" />
            <el-table-column prop="serviceType" label="Service Type" min-width="140" />
            <el-table-column prop="durationHours" label="Hours" width="90" />
            <el-table-column prop="timeCoins" label="Coins" width="90" />
            <el-table-column prop="startTime" label="Start" min-width="160" />
            <el-table-column prop="endTime" label="End" min-width="160" />
            <el-table-column label="Status" width="110">
              <template #default="{ row }">
                <el-tag
                  :type="row.status === 'confirmed' ? 'success' : row.status === 'pending' ? 'warning' : 'info'"
                  size="small"
                >
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="150" fixed="right">
              <template #default="{ row }">
                <template v-if="row.status === 'pending'">
                  <el-button type="success" link size="small" @click="handleConfirm(row)">Confirm</el-button>
                  <el-button type="danger" link size="small" @click="handleCancel(row)">Cancel</el-button>
                </template>
              </template>
            </el-table-column>
          </el-table>

          <div class="table-pagination">
            <el-pagination
              v-model:current-page="servicePage"
              layout="total, prev, pager, next"
              :total="serviceTotal"
              :page-size="servicePageSize"
              @current-change="fetchServiceHistory"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="Exchanges" name="exchange">
        <el-card class="table-card">
          <el-table :data="exchanges" stripe style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="Exchange ID" width="110" />
            <el-table-column prop="userId" label="User" width="100" />
            <el-table-column prop="exchangeType" label="Type" width="120" />
            <el-table-column prop="itemName" label="Item" min-width="180" />
            <el-table-column prop="coinsRequired" label="Coins" width="90" />
            <el-table-column prop="status" label="Status" width="110" />
            <el-table-column prop="createdAt" label="Created At" min-width="170" />
            <el-table-column prop="completedAt" label="Completed At" min-width="170" />
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="Leaderboard" name="leaderboard">
        <el-card class="table-card">
          <el-table :data="leaderboard" stripe style="width: 100%" v-loading="loading">
            <el-table-column prop="rank" label="Rank" width="80" />
            <el-table-column prop="userId" label="User" width="100" />
            <el-table-column prop="balance" label="Balance" width="110" />
            <el-table-column prop="totalEarned" label="Total Earned" width="140" />
            <el-table-column prop="creditScore" label="Credit Score" width="120" />
            <el-table-column prop="creditLevel" label="Credit Level" width="120" />
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.timebank-page { max-width: 1200px; }
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.stats-row { margin-bottom: 16px; }
.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.stat-num { font-size: 32px; font-weight: 700; line-height: 1.2; }
.stat-label { font-size: 13px; color: #999; margin-top: 4px; }
.table-card { border-radius: 8px; }
.table-pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
