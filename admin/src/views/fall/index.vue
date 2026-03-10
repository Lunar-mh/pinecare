<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'

interface FallEvent {
  id: number
  userName: string
  userAge: number
  location: string
  detectedAt: string
  severity: '轻微' | '中度' | '严重'
  confirmed: boolean
  injuryDesc: string
  status: '已处理' | '待确认' | '误报'
}

const searchText = ref('')
const filterSeverity = ref('')
const filterStatus = ref('')

const events = ref<FallEvent[]>([
  { id: 1, userName: '王秀英', userAge: 72, location: '卧室', detectedAt: '2024-03-09 06:45', severity: '中度', confirmed: true, injuryDesc: '左膝轻微擦伤，已处理', status: '已处理' },
  { id: 2, userName: '赵明远', userAge: 75, location: '卫生间', detectedAt: '2024-03-08 23:12', severity: '严重', confirmed: true, injuryDesc: '疑似髋部骨折，已送医', status: '已处理' },
  { id: 3, userName: '吴桂兰', userAge: 78, location: '客厅', detectedAt: '2024-03-09 09:30', severity: '轻微', confirmed: false, injuryDesc: '—', status: '待确认' },
  { id: 4, userName: '张建国', userAge: 68, location: '厨房', detectedAt: '2024-03-07 11:20', severity: '轻微', confirmed: false, injuryDesc: '—', status: '误报' },
  { id: 5, userName: '刘德华', userAge: 70, location: '卧室', detectedAt: '2024-03-06 05:30', severity: '中度', confirmed: true, injuryDesc: '背部淤伤，无骨折', status: '已处理' },
])

const filtered = computed(() => events.value.filter(e => {
  const matchText = !searchText.value || e.userName.includes(searchText.value)
  const matchSev = !filterSeverity.value || e.severity === filterSeverity.value
  const matchStat = !filterStatus.value || e.status === filterStatus.value
  return matchText && matchSev && matchStat
}))

const severityTagType = (s: string) => {
  const map: Record<string, 'success' | 'warning' | 'danger'> = { '轻微': 'success', '中度': 'warning', '严重': 'danger' }
  return map[s] ?? 'info'
}
const statusTagType = (s: string) => {
  const map: Record<string, 'success' | 'warning' | 'info'> = { '已处理': 'success', '待确认': 'warning', '误报': 'info' }
  return map[s] ?? 'info'
}
</script>

<template>
  <div class="fall-page">
    <div class="page-header">
      <span class="page-title">跌倒检测记录</span>
    </div>

    <!-- 统计 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <div class="stat-card" style="background: #ffebee">
          <div class="stat-num" style="color: #c62828">{{ events.filter(e => e.severity === '严重').length }}</div>
          <div class="stat-label">严重事件</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: #fff8e1">
          <div class="stat-num" style="color: #e65100">{{ events.filter(e => e.severity === '中度').length }}</div>
          <div class="stat-label">中度事件</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: #e8f5e9">
          <div class="stat-num" style="color: #2e7d32">{{ events.filter(e => e.status === '已处理').length }}</div>
          <div class="stat-label">已处理</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: #f5f5f5">
          <div class="stat-num" style="color: #757575">{{ events.filter(e => e.status === '误报').length }}</div>
          <div class="stat-label">误报次数</div>
        </div>
      </el-col>
    </el-row>

    <!-- 搜索 -->
    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="7">
          <el-input v-model="searchText" placeholder="搜索用户姓名" :prefix-icon="Search" clearable />
        </el-col>
        <el-col :span="5">
          <el-select v-model="filterSeverity" placeholder="严重程度" clearable style="width: 100%">
            <el-option label="轻微" value="轻微" />
            <el-option label="中度" value="中度" />
            <el-option label="严重" value="严重" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-select v-model="filterStatus" placeholder="处理状态" clearable style="width: 100%">
            <el-option label="已处理" value="已处理" />
            <el-option label="待确认" value="待确认" />
            <el-option label="误报" value="误报" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <!-- 列表 -->
    <el-card class="table-card">
      <el-table :data="filtered" stripe style="width: 100%">
        <el-table-column prop="userName" label="用户" width="100" />
        <el-table-column prop="userAge" label="年龄" width="65" />
        <el-table-column prop="location" label="跌倒位置" width="100" />
        <el-table-column prop="detectedAt" label="检测时间" width="160" />
        <el-table-column label="严重程度" width="100">
          <template #default="{ row }">
            <el-tag :type="severityTagType(row.severity)" size="small">{{ row.severity }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="已确认" width="80">
          <template #default="{ row }">
            <el-icon v-if="row.confirmed" color="#2e7d32"><Check /></el-icon>
            <el-icon v-else color="#bdbdbd"><Close /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="injuryDesc" label="伤情描述" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
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
.fall-page { max-width: 1200px; }
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
