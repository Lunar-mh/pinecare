<script setup lang="ts">
import { ref } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'

const communities = ref([
  { id: 1, name: '朝阳区幸福里社区', elderCount: 286, volunteerCount: 42, manager: '陈主任', status: '正常运营' },
  { id: 2, name: '海淀区安康园社区', elderCount: 193, volunteerCount: 28, manager: '李主任', status: '正常运营' },
  { id: 3, name: '丰台区夕阳红社区', elderCount: 145, volunteerCount: 19, manager: '王主任', status: '维护中' },
])
</script>

<template>
  <div class="community-page">
    <div class="page-header">
      <span class="page-title">社区管理</span>
      <el-button type="primary" :icon="Plus">添加社区</el-button>
    </div>

    <el-card class="filter-card">
      <el-row :gutter="12">
        <el-col :span="8">
          <el-input placeholder="搜索社区名称" :prefix-icon="Search" clearable />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" plain>搜索</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card">
      <el-table :data="communities" stripe style="width: 100%">
        <el-table-column prop="name" label="社区名称" min-width="200" />
        <el-table-column prop="elderCount" label="老人数量" width="120" />
        <el-table-column prop="volunteerCount" label="志愿者数量" width="120" />
        <el-table-column prop="manager" label="负责人" width="120" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === '正常运营' ? 'success' : 'warning'" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default>
            <el-button type="primary" link size="small">详情</el-button>
            <el-button type="warning" link size="small">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.community-page { max-width: 1200px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.filter-card { margin-bottom: 16px; border-radius: 8px; }
.table-card { border-radius: 8px; }
</style>
