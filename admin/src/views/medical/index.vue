<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

interface MedicalResource {
  id: number
  name: string
  type: '医院' | '诊所' | '药店' | '康复中心'
  address: string
  phone: string
  specialty: string
  distance: string
  rating: number
  status: '营业中' | '休息中' | '暂停服务'
  cooperative: boolean
}

const searchText = ref('')
const filterType = ref('')
const filterStatus = ref('')
const dialogVisible = ref(false)

const resources = ref<MedicalResource[]>([
  { id: 1, name: '朝阳区老年医院', type: '医院', address: '北京市朝阳区朝阳路88号', phone: '010-8888-0001', specialty: '老年综合、心血管、骨科', distance: '1.2km', rating: 4.8, status: '营业中', cooperative: true },
  { id: 2, name: '海淀社区卫生服务中心', type: '诊所', address: '北京市海淀区学院路3号', phone: '010-8888-0002', specialty: '全科、慢病管理', distance: '0.5km', rating: 4.5, status: '营业中', cooperative: true },
  { id: 3, name: '健康大药房（劲松店）', type: '药店', address: '北京市朝阳区劲松路1号', phone: '010-8888-0003', specialty: '处方药、OTC、医疗器械', distance: '0.3km', rating: 4.2, status: '营业中', cooperative: false },
  { id: 4, name: '阳光康复中心', type: '康复中心', address: '北京市丰台区马家堡路22号', phone: '010-8888-0004', specialty: '物理治疗、言语治疗、职业治疗', distance: '3.8km', rating: 4.6, status: '营业中', cooperative: true },
  { id: 5, name: '仁爱中医诊所', type: '诊所', address: '北京市西城区西单北大街', phone: '010-8888-0005', specialty: '中医内科、针灸推拿', distance: '2.1km', rating: 4.3, status: '休息中', cooperative: false },
])

const filtered = computed(() => resources.value.filter(r => {
  const matchText = !searchText.value || r.name.includes(searchText.value) || r.specialty.includes(searchText.value)
  const matchType = !filterType.value || r.type === filterType.value
  const matchStatus = !filterStatus.value || r.status === filterStatus.value
  return matchText && matchType && matchStatus
}))

const typeTagType = (t: string) => {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'info'> = {
    '医院': 'primary', '诊所': 'success', '药店': 'warning', '康复中心': 'info'
  }
  return map[t] ?? 'info'
}
const statusTagType = (s: string) => {
  const map: Record<string, 'success' | 'warning' | 'danger'> = {
    '营业中': 'success', '休息中': 'warning', '暂停服务': 'danger'
  }
  return map[s] ?? 'info'
}

function handleToggleCooperative(row: MedicalResource) {
  row.cooperative = !row.cooperative
  ElMessage.success(row.cooperative ? '已设为合作机构' : '已取消合作关系')
}
</script>

<template>
  <div class="medical-page">
    <div class="page-header">
      <span class="page-title">医疗资源管理</span>
      <el-button type="primary" :icon="Plus" @click="dialogVisible = true">新增资源</el-button>
    </div>

    <!-- 统计 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <div class="stat-card" style="background: #e3f2fd">
          <div class="stat-num" style="color: #01579b">{{ resources.length }}</div>
          <div class="stat-label">总资源数</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: #e8f5e9">
          <div class="stat-num" style="color: #2e7d32">{{ resources.filter(r => r.cooperative).length }}</div>
          <div class="stat-label">合作机构</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: #fff8e1">
          <div class="stat-num" style="color: #f57f17">{{ resources.filter(r => r.status === '营业中').length }}</div>
          <div class="stat-label">营业中</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: #f3e5f5">
          <div class="stat-num" style="color: #6a1b9a">{{ resources.filter(r => r.type === '医院').length }}</div>
          <div class="stat-label">合作医院</div>
        </div>
      </el-col>
    </el-row>

    <!-- 搜索 -->
    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input v-model="searchText" placeholder="搜索机构名称或专科" :prefix-icon="Search" clearable />
        </el-col>
        <el-col :span="5">
          <el-select v-model="filterType" placeholder="机构类型" clearable style="width: 100%">
            <el-option label="医院" value="医院" />
            <el-option label="诊所" value="诊所" />
            <el-option label="药店" value="药店" />
            <el-option label="康复中心" value="康复中心" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-select v-model="filterStatus" placeholder="营业状态" clearable style="width: 100%">
            <el-option label="营业中" value="营业中" />
            <el-option label="休息中" value="休息中" />
            <el-option label="暂停服务" value="暂停服务" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <!-- 列表 -->
    <el-card class="table-card">
      <el-table :data="filtered" stripe style="width: 100%">
        <el-table-column prop="name" label="机构名称" width="180" show-overflow-tooltip />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.type)" size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="specialty" label="专科/特色" show-overflow-tooltip />
        <el-table-column prop="phone" label="联系电话" width="140" />
        <el-table-column prop="distance" label="距离" width="80" />
        <el-table-column label="评分" width="80">
          <template #default="{ row }">
            <span style="color: #fb8c00; font-weight: 600">{{ row.rating }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="合作" width="80">
          <template #default="{ row }">
            <el-tag :type="row.cooperative ? 'success' : 'info'" size="small">
              {{ row.cooperative ? '合作' : '普通' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button
              :type="row.cooperative ? 'warning' : 'success'"
              link size="small"
              @click="handleToggleCooperative(row)"
            >{{ row.cooperative ? '取消合作' : '设为合作' }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="table-pagination">
        <el-pagination layout="total, prev, pager, next" :total="filtered.length" :page-size="10" />
      </div>
    </el-card>

    <!-- 新增弹窗 -->
    <el-dialog v-model="dialogVisible" title="新增医疗资源" width="520px">
      <el-form label-width="90px">
        <el-form-item label="机构名称"><el-input placeholder="请输入机构名称" /></el-form-item>
        <el-form-item label="机构类型">
          <el-select placeholder="请选择" style="width: 100%">
            <el-option label="医院" value="医院" />
            <el-option label="诊所" value="诊所" />
            <el-option label="药店" value="药店" />
            <el-option label="康复中心" value="康复中心" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系电话"><el-input placeholder="请输入联系电话" /></el-form-item>
        <el-form-item label="地址"><el-input placeholder="请输入详细地址" /></el-form-item>
        <el-form-item label="专科特色"><el-input placeholder="如：老年综合、心血管" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="dialogVisible = false">确认添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.medical-page { max-width: 1200px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.stats-row { margin-bottom: 16px; }
.stat-card { border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.stat-num { font-size: 32px; font-weight: 700; }
.stat-label { font-size: 13px; color: #666; margin-top: 4px; }
.filter-card { margin-bottom: 16px; border-radius: 8px; }
.table-card { border-radius: 8px; }
.table-pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
