<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'

interface GpsRecord {
  id: number
  userName: string
  userAge: number
  lat: number
  lng: number
  address: string
  updateTime: string
  batteryLevel: number
  status: '在家' | '外出' | '预警区域' | '离线'
  deviceId: string
}

const searchText = ref('')
const filterStatus = ref('')

const records = ref<GpsRecord[]>([
  { id: 1, userName: '王秀英', userAge: 72, lat: 39.908, lng: 116.397, address: '北京市朝阳区劲松路88号', updateTime: '刚刚', batteryLevel: 85, status: '在家', deviceId: 'DEV-001' },
  { id: 2, userName: '张建国', userAge: 68, lat: 40.002, lng: 116.325, address: '北京市海淀区学院路5号', updateTime: '5分钟前', batteryLevel: 62, status: '外出', deviceId: 'DEV-002' },
  { id: 3, userName: '赵明远', userAge: 75, lat: 39.862, lng: 116.288, address: '北京市丰台区安乐林路', updateTime: '10分钟前', batteryLevel: 23, status: '预警区域', deviceId: 'DEV-003' },
  { id: 4, userName: '刘德华', userAge: 70, lat: 39.906, lng: 116.198, address: '北京市石景山区', updateTime: '2小时前', batteryLevel: 0, status: '离线', deviceId: 'DEV-004' },
  { id: 5, userName: '吴桂兰', userAge: 78, lat: 40.128, lng: 116.603, address: '北京市顺义区光明南街', updateTime: '2分钟前', batteryLevel: 91, status: '在家', deviceId: 'DEV-005' },
])

const filtered = computed(() => records.value.filter(r => {
  const matchText = !searchText.value || r.userName.includes(searchText.value)
  const matchStatus = !filterStatus.value || r.status === filterStatus.value
  return matchText && matchStatus
}))

const statusTagType = (s: string) => {
  const map: Record<string, 'success' | 'primary' | 'danger' | 'info'> = {
    '在家': 'success', '外出': 'primary', '预警区域': 'danger', '离线': 'info'
  }
  return map[s] ?? 'info'
}

const batteryColor = (v: number) => {
  if (v <= 20) return '#e53935'
  if (v <= 40) return '#fb8c00'
  return '#2e7d32'
}

const batteryIcon = (v: number) => {
  if (v === 0) return '■'
  if (v <= 20) return '▪'
  if (v <= 60) return '▬'
  return '▮'
}
</script>

<template>
  <div class="gps-page">
    <div class="page-header">
      <span class="page-title">GPS 位置追踪</span>
    </div>

    <!-- 状态汇总 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <div class="stat-card" style="background: #e8f5e9">
          <div class="stat-num" style="color: #2e7d32">{{ records.filter(r => r.status === '在家').length }}</div>
          <div class="stat-label">在家</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: #e3f2fd">
          <div class="stat-num" style="color: #01579b">{{ records.filter(r => r.status === '外出').length }}</div>
          <div class="stat-label">外出中</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: #ffebee">
          <div class="stat-num" style="color: #c62828">{{ records.filter(r => r.status === '预警区域').length }}</div>
          <div class="stat-label">预警区域</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: #f5f5f5">
          <div class="stat-num" style="color: #757575">{{ records.filter(r => r.status === '离线').length }}</div>
          <div class="stat-label">设备离线</div>
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
          <el-select v-model="filterStatus" placeholder="位置状态" clearable style="width: 100%">
            <el-option label="在家" value="在家" />
            <el-option label="外出" value="外出" />
            <el-option label="预警区域" value="预警区域" />
            <el-option label="离线" value="离线" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <!-- 列表 -->
    <el-card class="table-card">
      <el-table :data="filtered" stripe style="width: 100%">
        <el-table-column prop="userName" label="用户" width="90" />
        <el-table-column prop="userAge" label="年龄" width="65" />
        <el-table-column prop="deviceId" label="设备ID" width="100" />
        <el-table-column prop="address" label="当前位置" show-overflow-tooltip />
        <el-table-column prop="updateTime" label="更新时间" width="120" />
        <el-table-column label="电量" width="110">
          <template #default="{ row }">
            <span :style="{ color: batteryColor(row.batteryLevel), fontWeight: 600 }">
              {{ batteryIcon(row.batteryLevel) }} {{ row.batteryLevel }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default>
            <el-button type="primary" link size="small">轨迹记录</el-button>
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
.gps-page { max-width: 1200px; }
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
