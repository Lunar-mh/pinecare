<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface ServiceRecord {
  id: number
  volunteerName: string
  elderName: string
  serviceType: string
  hours: number
  earnedPoints: number
  serviceDate: string
  status: '待审核' | '已通过' | '已拒绝'
}

interface Exchange {
  id: number
  userName: string
  points: number
  item: string
  exchangeDate: string
  status: '待发放' | '已发放'
}

const activeTab = ref('records')
const searchText = ref('')
const filterStatus = ref('')

const records = ref<ServiceRecord[]>([
  { id: 1, volunteerName: '张明', elderName: '王秀英', serviceType: '日常陪伴', hours: 2, earnedPoints: 20, serviceDate: '2024-03-09', status: '已通过' },
  { id: 2, volunteerName: '李华', elderName: '赵明远', serviceType: '医疗护理', hours: 3, earnedPoints: 45, serviceDate: '2024-03-09', status: '待审核' },
  { id: 3, volunteerName: '王芳', elderName: '吴桂兰', serviceType: '生活协助', hours: 1.5, earnedPoints: 15, serviceDate: '2024-03-08', status: '已通过' },
  { id: 4, volunteerName: '赵强', elderName: '张建国', serviceType: '心理疏导', hours: 1, earnedPoints: 15, serviceDate: '2024-03-08', status: '已拒绝' },
  { id: 5, volunteerName: '刘洋', elderName: '刘德华', serviceType: '医疗护理', hours: 2, earnedPoints: 30, serviceDate: '2024-03-07', status: '已通过' },
])

const exchanges = ref<Exchange[]>([
  { id: 1, userName: '张明', points: 50, item: '米面粮油礼包', exchangeDate: '2024-03-08', status: '已发放' },
  { id: 2, userName: '王芳', points: 30, item: '超市购物券', exchangeDate: '2024-03-09', status: '待发放' },
  { id: 3, userName: '李华', points: 100, item: '按摩椅体验券', exchangeDate: '2024-03-07', status: '已发放' },
])

const filteredRecords = computed(() => records.value.filter(r => {
  const matchText = !searchText.value || r.volunteerName.includes(searchText.value) || r.elderName.includes(searchText.value)
  const matchStatus = !filterStatus.value || r.status === filterStatus.value
  return matchText && matchStatus
}))

const statusTagType = (s: string) => {
  const map: Record<string, 'warning' | 'success' | 'danger'> = { '待审核': 'warning', '已通过': 'success', '已拒绝': 'danger' }
  return map[s] ?? 'info'
}

const totalPoints = computed(() => records.value.filter(r => r.status === '已通过').reduce((s, r) => s + r.earnedPoints, 0))

function handleApprove(row: ServiceRecord) {
  ElMessageBox.confirm(`确认审核通过「${row.volunteerName}」的服务记录？`, '审核确认', {
    confirmButtonText: '通过',
    cancelButtonText: '取消',
    type: 'success',
  }).then(() => {
    row.status = '已通过'
    ElMessage.success('已审核通过，积分已发放')
  }).catch(() => {})
}

function handleReject(row: ServiceRecord) {
  row.status = '已拒绝'
  ElMessage.warning('已拒绝该服务记录')
}

function handleDeliver(row: Exchange) {
  row.status = '已发放'
  ElMessage.success('已标记为发放')
}
</script>

<template>
  <div class="timebank-page">
    <div class="page-header">
      <span class="page-title">时间银行管理</span>
    </div>

    <!-- 统计 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <div class="stat-card" style="background: #e3f2fd">
          <div class="stat-num" style="color: #01579b">{{ records.length }}</div>
          <div class="stat-label">总服务记录</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: #fff8e1">
          <div class="stat-num" style="color: #f57f17">{{ records.filter(r => r.status === '待审核').length }}</div>
          <div class="stat-label">待审核</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: #e8f5e9">
          <div class="stat-num" style="color: #2e7d32">{{ totalPoints }}</div>
          <div class="stat-label">累计发放积分</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: #f3e5f5">
          <div class="stat-num" style="color: #6a1b9a">{{ exchanges.filter(e => e.status === '待发放').length }}</div>
          <div class="stat-label">待发放兑换</div>
        </div>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="服务记录审核" name="records">
        <!-- 搜索 -->
        <el-card class="filter-card" style="margin-bottom: 16px">
          <el-row :gutter="12" align="middle">
            <el-col :span="8">
              <el-input v-model="searchText" placeholder="搜索志愿者或长辈姓名" :prefix-icon="Search" clearable />
            </el-col>
            <el-col :span="5">
              <el-select v-model="filterStatus" placeholder="审核状态" clearable style="width: 100%">
                <el-option label="待审核" value="待审核" />
                <el-option label="已通过" value="已通过" />
                <el-option label="已拒绝" value="已拒绝" />
              </el-select>
            </el-col>
          </el-row>
        </el-card>
        <el-card class="table-card">
          <el-table :data="filteredRecords" stripe style="width: 100%">
            <el-table-column prop="volunteerName" label="志愿者" width="100" />
            <el-table-column prop="elderName" label="服务长辈" width="100" />
            <el-table-column prop="serviceType" label="服务类型" width="120" />
            <el-table-column prop="hours" label="服务时长(h)" width="120" />
            <el-table-column prop="earnedPoints" label="可获积分" width="100" />
            <el-table-column prop="serviceDate" label="服务日期" width="120" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <template v-if="row.status === '待审核'">
                  <el-button type="success" link size="small" @click="handleApprove(row)">通过</el-button>
                  <el-button type="danger" link size="small" @click="handleReject(row)">拒绝</el-button>
                </template>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="积分兑换管理" name="exchange">
        <el-card class="table-card">
          <el-table :data="exchanges" stripe style="width: 100%">
            <el-table-column prop="userName" label="兑换用户" width="120" />
            <el-table-column prop="points" label="消耗积分" width="110" />
            <el-table-column prop="item" label="兑换商品" />
            <el-table-column prop="exchangeDate" label="兑换日期" width="130" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === '已发放' ? 'success' : 'warning'" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === '待发放'"
                  type="primary" link size="small"
                  @click="handleDeliver(row)"
                >确认发放</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.timebank-page { max-width: 1200px; }
.page-header { display: flex; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.stats-row { margin-bottom: 20px; }
.stat-card { border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.stat-num { font-size: 32px; font-weight: 700; }
.stat-label { font-size: 13px; color: #666; margin-top: 4px; }
.filter-card { border-radius: 8px; }
.table-card { border-radius: 8px; }
</style>
