<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

interface DrugCheckRecord {
  id: number
  userName: string
  drug1: string
  drug2: string
  riskLevel: '安全' | '注意' | '禁忌'
  description: string
  checkTime: string
  handled: boolean
}

const searchText = ref('')
const filterRisk = ref('')

const records = ref<DrugCheckRecord[]>([
  { id: 1, userName: '赵明远', drug1: '华法林', drug2: '阿司匹林', riskLevel: '禁忌', description: '两药合用显著增加出血风险，应避免联用', checkTime: '2024-03-09 08:10', handled: false },
  { id: 2, userName: '张建国', drug1: '二甲双胍', drug2: '格列本脲', riskLevel: '注意', description: '联用可能增加低血糖风险，需密切监测血糖', checkTime: '2024-03-09 09:30', handled: true },
  { id: 3, userName: '王秀英', drug1: '硝苯地平', drug2: '美托洛尔', riskLevel: '安全', description: '两药联用安全，可起到协同降压效果', checkTime: '2024-03-08 15:20', handled: true },
  { id: 4, userName: '吴桂兰', drug1: '辛伐他汀', drug2: '氨氯地平', riskLevel: '注意', description: '氨氯地平可升高辛伐他汀血药浓度，建议减量', checkTime: '2024-03-08 11:45', handled: false },
  { id: 5, userName: '刘德华', drug1: '地高辛', drug2: '螺内酯', riskLevel: '注意', description: '可能导致地高辛浓度升高，需监测地高辛水平', checkTime: '2024-03-07 16:00', handled: true },
])

const filtered = computed(() => records.value.filter(r => {
  const matchText = !searchText.value || r.userName.includes(searchText.value) || r.drug1.includes(searchText.value) || r.drug2.includes(searchText.value)
  const matchRisk = !filterRisk.value || r.riskLevel === filterRisk.value
  return matchText && matchRisk
}))

const riskTagType = (r: string) => {
  const map: Record<string, 'success' | 'warning' | 'danger'> = { '安全': 'success', '注意': 'warning', '禁忌': 'danger' }
  return map[r] ?? 'info'
}

function handleProcess(row: DrugCheckRecord) {
  row.handled = true
  ElMessage.success('已标记为已处理')
}
</script>

<template>
  <div class="drug-page">
    <div class="page-header">
      <span class="page-title">药物相互作用记录</span>
    </div>

    <!-- 风险汇总 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="8">
        <div class="stat-card" style="background: #ffebee; border-left: 4px solid #e53935">
          <div class="stat-num" style="color: #c62828">{{ records.filter(r => r.riskLevel === '禁忌').length }}</div>
          <div class="stat-label">禁忌组合</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card" style="background: #fff8e1; border-left: 4px solid #fb8c00">
          <div class="stat-num" style="color: #e65100">{{ records.filter(r => r.riskLevel === '注意').length }}</div>
          <div class="stat-label">需注意</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card" style="background: #f5f5f5; border-left: 4px solid #9e9e9e">
          <div class="stat-num" style="color: #757575">{{ records.filter(r => !r.handled).length }}</div>
          <div class="stat-label">未处理</div>
        </div>
      </el-col>
    </el-row>

    <!-- 搜索 -->
    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input v-model="searchText" placeholder="搜索用户或药品名" :prefix-icon="Search" clearable />
        </el-col>
        <el-col :span="5">
          <el-select v-model="filterRisk" placeholder="风险等级" clearable style="width: 100%">
            <el-option label="安全" value="安全" />
            <el-option label="注意" value="注意" />
            <el-option label="禁忌" value="禁忌" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <!-- 列表 -->
    <el-card class="table-card">
      <el-table :data="filtered" stripe style="width: 100%">
        <el-table-column prop="userName" label="用户" width="100" />
        <el-table-column prop="drug1" label="药物 A" width="130" />
        <el-table-column prop="drug2" label="药物 B" width="130" />
        <el-table-column label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="riskTagType(row.riskLevel)" size="small">{{ row.riskLevel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="风险说明" show-overflow-tooltip />
        <el-table-column prop="checkTime" label="检测时间" width="155" />
        <el-table-column label="处理状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.handled ? 'success' : 'warning'" size="small">
              {{ row.handled ? '已处理' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!row.handled"
              type="primary" link size="small"
              @click="handleProcess(row)"
            >标记处理</el-button>
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
.drug-page { max-width: 1200px; }
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
