<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

interface MedRecord {
  id: number
  userName: string
  drugName: string
  dosage: string
  frequency: string
  nextTime: string
  adherence: number
  status: '已服药' | '待服药' | '已漏服'
  startDate: string
}

const searchText = ref('')
const filterStatus = ref('')

const records = ref<MedRecord[]>([
  { id: 1, userName: '王秀英', drugName: '硝苯地平缓释片', dosage: '30mg', frequency: '每日1次', nextTime: '今日 08:00', adherence: 95, status: '已服药', startDate: '2024-01-10' },
  { id: 2, userName: '张建国', drugName: '二甲双胍', dosage: '500mg', frequency: '每日3次', nextTime: '今日 12:00', adherence: 78, status: '待服药', startDate: '2023-11-20' },
  { id: 3, userName: '赵明远', drugName: '阿司匹林肠溶片', dosage: '100mg', frequency: '每日1次', nextTime: '今日 08:00', adherence: 42, status: '已漏服', startDate: '2023-08-15' },
  { id: 4, userName: '吴桂兰', drugName: '苯磺酸氨氯地平', dosage: '5mg', frequency: '每日1次', nextTime: '明日 08:00', adherence: 88, status: '已服药', startDate: '2024-02-01' },
  { id: 5, userName: '刘德华', drugName: '瑞舒伐他汀钙片', dosage: '10mg', frequency: '每晚1次', nextTime: '今日 21:00', adherence: 92, status: '待服药', startDate: '2024-01-25' },
])

const filtered = computed(() => records.value.filter(r => {
  const matchText = !searchText.value || r.userName.includes(searchText.value) || r.drugName.includes(searchText.value)
  const matchStatus = !filterStatus.value || r.status === filterStatus.value
  return matchText && matchStatus
}))

const statusTagType = (s: string) => {
  const map: Record<string, 'success' | 'warning' | 'danger'> = { '已服药': 'success', '待服药': 'warning', '已漏服': 'danger' }
  return map[s] ?? 'info'
}

const adherenceColor = (v: number) => v >= 80 ? '#2e7d32' : v >= 60 ? '#fb8c00' : '#e53935'

function handleRemind(row: MedRecord) {
  ElMessage.success(`已向 ${row.userName} 发送服药提醒`)
}
</script>

<template>
  <div class="medication-page">
    <div class="page-header">
      <span class="page-title">用药提醒管理</span>
    </div>

    <!-- 汇总 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="8">
        <div class="stat-card" style="background: #e8f5e9">
          <div class="stat-num" style="color: #2e7d32">{{ records.filter(r => r.status === '已服药').length }}</div>
          <div class="stat-label">今日已服药</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card" style="background: #fff8e1">
          <div class="stat-num" style="color: #f57f17">{{ records.filter(r => r.status === '待服药').length }}</div>
          <div class="stat-label">待服药</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card" style="background: #ffebee">
          <div class="stat-num" style="color: #c62828">{{ records.filter(r => r.status === '已漏服').length }}</div>
          <div class="stat-label">已漏服</div>
        </div>
      </el-col>
    </el-row>

    <!-- 搜索 -->
    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input v-model="searchText" placeholder="搜索姓名或药品名" :prefix-icon="Search" clearable />
        </el-col>
        <el-col :span="5">
          <el-select v-model="filterStatus" placeholder="服药状态" clearable style="width: 100%">
            <el-option label="已服药" value="已服药" />
            <el-option label="待服药" value="待服药" />
            <el-option label="已漏服" value="已漏服" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <!-- 列表 -->
    <el-card class="table-card">
      <el-table :data="filtered" stripe style="width: 100%">
        <el-table-column prop="userName" label="用户" width="100" />
        <el-table-column prop="drugName" label="药品名称" />
        <el-table-column prop="dosage" label="剂量" width="90" />
        <el-table-column prop="frequency" label="频率" width="110" />
        <el-table-column prop="nextTime" label="下次服药" width="130" />
        <el-table-column label="依从率" width="140">
          <template #default="{ row }">
            <el-progress
              :percentage="row.adherence"
              :color="adherenceColor(row.adherence)"
              :stroke-width="8"
              :show-text="false"
              style="width: 80px; display: inline-block; vertical-align: middle; margin-right: 8px"
            />
            <span :style="{ color: adherenceColor(row.adherence), fontWeight: 600 }">{{ row.adherence }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleRemind(row)">发送提醒</el-button>
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
.medication-page { max-width: 1200px; }
.page-header { display: flex; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.stats-row { margin-bottom: 16px; }
.stat-card { border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.stat-num { font-size: 32px; font-weight: 700; }
.stat-label { font-size: 13px; color: #666; margin-top: 4px; }
.filter-card { margin-bottom: 16px; border-radius: 8px; }
.table-card { border-radius: 8px; }
.table-pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
