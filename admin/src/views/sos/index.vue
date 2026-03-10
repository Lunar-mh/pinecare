<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface SosEvent {
  id: number
  userName: string
  userAge: number
  phone: string
  location: string
  triggerTime: string
  status: '待处理' | '处理中' | '已解决' | '误触发'
  responder?: string
  resolveTime?: string
  description: string
}

const searchText = ref('')
const filterStatus = ref('')
const detailVisible = ref(false)
const selectedEvent = ref<SosEvent | null>(null)

const events = ref<SosEvent[]>([
  { id: 1, userName: '赵明远', userAge: 75, phone: '136****3456', location: '北京市丰台区马家堡东路', triggerTime: '2024-03-09 08:23', status: '已解决', responder: '张护士', resolveTime: '2024-03-09 08:35', description: '老人按下SOS按钮，家属已赶到现场，情况稳定' },
  { id: 2, userName: '吴桂兰', userAge: 78, phone: '133****6789', location: '北京市顺义区光明南街', triggerTime: '2024-03-09 09:15', status: '处理中', responder: '李志愿者', description: '老人感到头晕，志愿者正在赶往现场' },
  { id: 3, userName: '王秀英', userAge: 72, phone: '138****1234', location: '北京市朝阳区劲松路', triggerTime: '2024-03-09 10:02', status: '待处理', description: '自动SOS触发，疑似跌倒检测报警' },
  { id: 4, userName: '张建国', userAge: 68, phone: '139****5678', location: '北京市海淀区学院路', triggerTime: '2024-03-08 15:30', status: '误触发', responder: '系统自动', resolveTime: '2024-03-08 15:32', description: '老人确认为误操作' },
  { id: 5, userName: '刘德华', userAge: 70, phone: '134****2345', location: '北京市石景山区', triggerTime: '2024-03-08 20:45', status: '已解决', responder: '家属李芳芳', resolveTime: '2024-03-08 21:00', description: '老人血压升高，家属已送医，情况好转' },
])

const filtered = computed(() => events.value.filter(e => {
  const matchText = !searchText.value || e.userName.includes(searchText.value)
  const matchStatus = !filterStatus.value || e.status === filterStatus.value
  return matchText && matchStatus
}))

const statusTagType = (s: string) => {
  const map: Record<string, 'danger' | 'warning' | 'success' | 'info'> = {
    '待处理': 'danger', '处理中': 'warning', '已解决': 'success', '误触发': 'info'
  }
  return map[s] ?? 'info'
}

function handleViewDetail(row: SosEvent) {
  selectedEvent.value = row
  detailVisible.value = true
}

function handleAssign(row: SosEvent) {
  ElMessageBox.prompt('请输入处理人员姓名', '指派处理人', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
  }).then(({ value }) => {
    if (value) {
      row.status = '处理中'
      row.responder = value
      ElMessage.success(`已指派 ${value} 处理`)
    }
  }).catch(() => {})
}

function handleResolve(row: SosEvent) {
  ElMessageBox.confirm('确认标记此事件为已解决？', '操作确认', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'success',
  }).then(() => {
    row.status = '已解决'
    row.resolveTime = new Date().toLocaleString('zh-CN')
    ElMessage.success('已标记为解决')
  }).catch(() => {})
}
</script>

<template>
  <div class="sos-page">
    <div class="page-header">
      <span class="page-title">SOS 紧急事件管理</span>
    </div>

    <!-- 告警统计 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <div class="stat-card" style="background: #ffebee; border-left: 4px solid #e53935">
          <div class="stat-num" style="color: #c62828">{{ events.filter(e => e.status === '待处理').length }}</div>
          <div class="stat-label">待处理</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: #fff8e1; border-left: 4px solid #fb8c00">
          <div class="stat-num" style="color: #e65100">{{ events.filter(e => e.status === '处理中').length }}</div>
          <div class="stat-label">处理中</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: #e8f5e9; border-left: 4px solid #43a047">
          <div class="stat-num" style="color: #2e7d32">{{ events.filter(e => e.status === '已解决').length }}</div>
          <div class="stat-label">已解决</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: #f5f5f5; border-left: 4px solid #9e9e9e">
          <div class="stat-num" style="color: #757575">{{ events.filter(e => e.status === '误触发').length }}</div>
          <div class="stat-label">误触发</div>
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
          <el-select v-model="filterStatus" placeholder="事件状态" clearable style="width: 100%">
            <el-option label="待处理" value="待处理" />
            <el-option label="处理中" value="处理中" />
            <el-option label="已解决" value="已解决" />
            <el-option label="误触发" value="误触发" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <!-- 事件列表 -->
    <el-card class="table-card">
      <el-table :data="filtered" stripe style="width: 100%" row-class-name="sos-row">
        <el-table-column prop="userName" label="用户" width="90" />
        <el-table-column prop="userAge" label="年龄" width="65" />
        <el-table-column prop="phone" label="手机号" width="120" />
        <el-table-column prop="location" label="位置" show-overflow-tooltip />
        <el-table-column prop="triggerTime" label="触发时间" width="160" />
        <el-table-column prop="responder" label="处理人" width="100">
          <template #default="{ row }">{{ row.responder ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewDetail(row)">详情</el-button>
            <el-button
              v-if="row.status === '待处理'"
              type="warning" link size="small"
              @click="handleAssign(row)"
            >指派</el-button>
            <el-button
              v-if="row.status === '处理中'"
              type="success" link size="small"
              @click="handleResolve(row)"
            >标记解决</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="table-pagination">
        <el-pagination layout="total, prev, pager, next" :total="filtered.length" :page-size="10" />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="SOS事件详情" width="520px">
      <el-descriptions :column="2" border v-if="selectedEvent">
        <el-descriptions-item label="用户">{{ selectedEvent.userName }}</el-descriptions-item>
        <el-descriptions-item label="年龄">{{ selectedEvent.userAge }}岁</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ selectedEvent.phone }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTagType(selectedEvent.status)" size="small">{{ selectedEvent.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="触发时间" :span="2">{{ selectedEvent.triggerTime }}</el-descriptions-item>
        <el-descriptions-item label="位置" :span="2">{{ selectedEvent.location }}</el-descriptions-item>
        <el-descriptions-item label="处理人">{{ selectedEvent.responder ?? '—' }}</el-descriptions-item>
        <el-descriptions-item label="解决时间">{{ selectedEvent.resolveTime ?? '—' }}</el-descriptions-item>
        <el-descriptions-item label="事件描述" :span="2">{{ selectedEvent.description }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.sos-page { max-width: 1200px; }
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
