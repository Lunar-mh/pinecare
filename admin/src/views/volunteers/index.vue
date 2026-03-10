<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'

interface Volunteer {
  id: number
  name: string
  skill: string
  hours: number
  status: '在线' | '离线' | '暂停'
  phone: string
  joinDate: string
}

const searchText = ref('')
const filterStatus = ref('')

const volunteers = ref<Volunteer[]>([
  { id: 1, name: '张明', skill: '医疗护理', hours: 128, status: '在线', phone: '138****1234', joinDate: '2024-01-15' },
  { id: 2, name: '李华', skill: '心理疏导', hours: 96, status: '在线', phone: '139****5678', joinDate: '2024-02-20' },
  { id: 3, name: '王芳', skill: '日常陪伴', hours: 210, status: '离线', phone: '137****9012', joinDate: '2023-11-08' },
  { id: 4, name: '赵强', skill: '生活协助', hours: 55, status: '暂停', phone: '136****3456', joinDate: '2024-03-01' },
  { id: 5, name: '刘洋', skill: '医疗护理', hours: 183, status: '在线', phone: '135****7890', joinDate: '2023-09-12' },
])

const dialogVisible = ref(false)
const form = reactive({ name: '', skill: '', phone: '' })

const statusTagType = (status: string) => {
  const map: Record<string, string> = { '在线': 'success', '离线': 'info', '暂停': 'warning' }
  return map[status] || 'info'
}
</script>

<template>
  <div class="volunteers-page">
    <div class="page-header">
      <span class="page-title">志愿者管理</span>
      <el-button type="primary" :icon="Plus" @click="dialogVisible = true">新增志愿者</el-button>
    </div>

    <!-- 搜索筛选栏 -->
    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input
            v-model="searchText"
            placeholder="搜索姓名或技能"
            :prefix-icon="Search"
            clearable
          />
        </el-col>
        <el-col :span="6">
          <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 100%">
            <el-option label="在线" value="在线" />
            <el-option label="离线" value="离线" />
            <el-option label="暂停" value="暂停" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" plain>搜索</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 志愿者列表 -->
    <el-card class="table-card">
      <el-table :data="volunteers" stripe style="width: 100%">
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="skill" label="技能方向" width="120" />
        <el-table-column prop="hours" label="服务时长(h)" width="130" sortable />
        <el-table-column prop="phone" label="联系电话" width="140" />
        <el-table-column prop="joinDate" label="加入日期" width="120" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default>
            <el-button type="primary" link size="small">编辑</el-button>
            <el-button type="warning" link size="small">暂停</el-button>
            <el-button type="danger" link size="small">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="table-pagination">
        <el-pagination layout="total, prev, pager, next" :total="volunteers.length" :page-size="10" />
      </div>
    </el-card>

    <!-- 新增对话框 -->
    <el-dialog v-model="dialogVisible" title="新增志愿者" width="480px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="姓名">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="技能方向">
          <el-input v-model="form.skill" placeholder="如：医疗护理、日常陪伴" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="dialogVisible = false">确认添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.volunteers-page {
  max-width: 1200px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.filter-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.table-card {
  border-radius: 8px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
