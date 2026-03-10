<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'

interface HealthRecord {
  id: number
  userName: string
  userAge: number
  bloodPressure: string
  heartRate: number
  bloodSugar: number
  weight: number
  riskLevel: '正常' | '偏高' | '危险'
  lastUpdate: string
}

const searchText = ref('')
const filterRisk = ref('')

const records = ref<HealthRecord[]>([
  { id: 1, userName: '王秀英', userAge: 72, bloodPressure: '125/80', heartRate: 72, bloodSugar: 5.8, weight: 58, riskLevel: '正常', lastUpdate: '2024-03-09 08:30' },
  { id: 2, userName: '张建国', userAge: 68, bloodPressure: '145/92', heartRate: 88, bloodSugar: 7.2, weight: 75, riskLevel: '偏高', lastUpdate: '2024-03-09 09:15' },
  { id: 3, userName: '赵明远', userAge: 75, bloodPressure: '165/105', heartRate: 96, bloodSugar: 9.8, weight: 82, riskLevel: '危险', lastUpdate: '2024-03-09 07:45' },
  { id: 4, userName: '刘德华', userAge: 70, bloodPressure: '118/75', heartRate: 68, bloodSugar: 5.2, weight: 70, riskLevel: '正常', lastUpdate: '2024-03-08 20:00' },
  { id: 5, userName: '吴桂兰', userAge: 78, bloodPressure: '138/88', heartRate: 82, bloodSugar: 6.5, weight: 52, riskLevel: '偏高', lastUpdate: '2024-03-09 10:00' },
])

const filtered = computed(() => records.value.filter(r => {
  const matchText = !searchText.value || r.userName.includes(searchText.value)
  const matchRisk = !filterRisk.value || r.riskLevel === filterRisk.value
  return matchText && matchRisk
}))

const riskTagType = (risk: string) => {
  const map: Record<string, 'success' | 'warning' | 'danger'> = { '正常': 'success', '偏高': 'warning', '危险': 'danger' }
  return map[risk] ?? 'info'
}

const bpColor = (bp: string) => {
  const sys = parseInt(bp.split('/')[0] ?? '0')
  if (sys >= 160) return '#e53935'
  if (sys >= 140) return '#fb8c00'
  return '#2e7d32'
}
</script>

<template>
  <div class="health-page">
    <div class="page-header">
      <span class="page-title">健康档案管理</span>
    </div>

    <!-- 风险汇总 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="8">
        <div class="stat-card stat-card--normal">
          <div class="stat-num">{{ records.filter(r => r.riskLevel === '正常').length }}</div>
          <div class="stat-label">健康正常</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card stat-card--warn">
          <div class="stat-num">{{ records.filter(r => r.riskLevel === '偏高').length }}</div>
          <div class="stat-label">指标偏高</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card stat-card--danger">
          <div class="stat-num">{{ records.filter(r => r.riskLevel === '危险').length }}</div>
          <div class="stat-label">需要关注</div>
        </div>
      </el-col>
    </el-row>

    <!-- 搜索 -->
    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input v-model="searchText" placeholder="搜索用户姓名" :prefix-icon="Search" clearable />
        </el-col>
        <el-col :span="5">
          <el-select v-model="filterRisk" placeholder="风险等级" clearable style="width: 100%">
            <el-option label="正常" value="正常" />
            <el-option label="偏高" value="偏高" />
            <el-option label="危险" value="危险" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <!-- 档案列表 -->
    <el-card class="table-card">
      <el-table :data="filtered" stripe style="width: 100%">
        <el-table-column prop="userName" label="姓名" width="100" />
        <el-table-column prop="userAge" label="年龄" width="70" />
        <el-table-column label="血压 (mmHg)" width="130">
          <template #default="{ row }">
            <span :style="{ color: bpColor(row.bloodPressure), fontWeight: 600 }">{{ row.bloodPressure }}</span>
          </template>
        </el-table-column>
        <el-table-column label="心率 (bpm)" width="120">
          <template #default="{ row }">
            <span :style="{ color: row.heartRate > 90 ? '#e53935' : '#1a1a1a' }">{{ row.heartRate }}</span>
          </template>
        </el-table-column>
        <el-table-column label="血糖 (mmol/L)" width="130">
          <template #default="{ row }">
            <span :style="{ color: row.bloodSugar > 7 ? '#e53935' : '#1a1a1a' }">{{ row.bloodSugar }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="weight" label="体重 (kg)" width="100" />
        <el-table-column label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="riskTagType(row.riskLevel)" size="small">{{ row.riskLevel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastUpdate" label="最新更新" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default>
            <el-button type="primary" link size="small">查看趋势</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="table-pagination">
        <el-pagination layout="total, prev, pager, next" :total="filtered.length" :page-size="10" />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.health-page { max-width: 1200px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.stats-row { margin-bottom: 16px; }
.stat-card {
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.stat-card--normal { background: #e8f5e9; }
.stat-card--warn { background: #fff8e1; }
.stat-card--danger { background: #ffebee; }
.stat-num { font-size: 32px; font-weight: 700; color: #1a1a1a; }
.stat-label { font-size: 13px; color: #666; margin-top: 4px; }
.filter-card { margin-bottom: 16px; border-radius: 8px; }
.table-card { border-radius: 8px; }
.table-pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
