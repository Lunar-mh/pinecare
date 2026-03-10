<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

interface FamilyBinding {
  id: number
  elderName: string
  elderAge: number
  elderPhone: string
  familyName: string
  familyPhone: string
  relation: string
  bindDate: string
  notifyEnabled: boolean
  status: '有效' | '已解绑'
}

const searchText = ref('')
const filterStatus = ref('')
const dialogVisible = ref(false)

const bindings = ref<FamilyBinding[]>([
  { id: 1, elderName: '王秀英', elderAge: 72, elderPhone: '138****1234', familyName: '王明', familyPhone: '158****1111', relation: '儿子', bindDate: '2024-01-10', notifyEnabled: true, status: '有效' },
  { id: 2, elderName: '张建国', elderAge: 68, elderPhone: '139****5678', familyName: '张丽', familyPhone: '159****2222', relation: '女儿', bindDate: '2024-01-20', notifyEnabled: true, status: '有效' },
  { id: 3, elderName: '赵明远', elderAge: 75, elderPhone: '136****3456', familyName: '赵磊', familyPhone: '157****3333', relation: '儿子', bindDate: '2023-12-01', notifyEnabled: false, status: '有效' },
  { id: 4, elderName: '刘德华', elderAge: 70, elderPhone: '134****2345', familyName: '刘洋', familyPhone: '156****4444', relation: '孙子', bindDate: '2023-11-15', notifyEnabled: true, status: '已解绑' },
  { id: 5, elderName: '吴桂兰', elderAge: 78, elderPhone: '133****6789', familyName: '吴强', familyPhone: '155****5555', relation: '儿子', bindDate: '2024-02-05', notifyEnabled: true, status: '有效' },
])

const filtered = computed(() => bindings.value.filter(b => {
  const matchText = !searchText.value || b.elderName.includes(searchText.value) || b.familyName.includes(searchText.value)
  const matchStatus = !filterStatus.value || b.status === filterStatus.value
  return matchText && matchStatus
}))

const statusTagType = (s: string) => s === '有效' ? 'success' : 'info'

function handleToggleNotify(row: FamilyBinding) {
  row.notifyEnabled = !row.notifyEnabled
  ElMessage.success(`已${row.notifyEnabled ? '开启' : '关闭'}通知`)
}
</script>

<template>
  <div class="family-page">
    <div class="page-header">
      <span class="page-title">家属绑定管理</span>
      <el-button type="primary" :icon="Plus" @click="dialogVisible = true">新增绑定</el-button>
    </div>

    <!-- 统计 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="8">
        <div class="stat-card" style="background: #e3f2fd">
          <div class="stat-num" style="color: #01579b">{{ bindings.length }}</div>
          <div class="stat-label">总绑定数</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card" style="background: #e8f5e9">
          <div class="stat-num" style="color: #2e7d32">{{ bindings.filter(b => b.status === '有效').length }}</div>
          <div class="stat-label">有效绑定</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card" style="background: #f3e5f5">
          <div class="stat-num" style="color: #6a1b9a">{{ bindings.filter(b => b.notifyEnabled).length }}</div>
          <div class="stat-label">通知已开启</div>
        </div>
      </el-col>
    </el-row>

    <!-- 搜索 -->
    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input v-model="searchText" placeholder="搜索长辈或家属姓名" :prefix-icon="Search" clearable />
        </el-col>
        <el-col :span="5">
          <el-select v-model="filterStatus" placeholder="绑定状态" clearable style="width: 100%">
            <el-option label="有效" value="有效" />
            <el-option label="已解绑" value="已解绑" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <!-- 列表 -->
    <el-card class="table-card">
      <el-table :data="filtered" stripe style="width: 100%">
        <el-table-column label="长辈信息" width="160">
          <template #default="{ row }">
            <div>{{ row.elderName }}（{{ row.elderAge }}岁）</div>
            <div style="color: #999; font-size: 12px">{{ row.elderPhone }}</div>
          </template>
        </el-table-column>
        <el-table-column label="家属信息" width="160">
          <template #default="{ row }">
            <div>{{ row.familyName }}（{{ row.relation }}）</div>
            <div style="color: #999; font-size: 12px">{{ row.familyPhone }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="bindDate" label="绑定时间" width="120" />
        <el-table-column label="消息通知" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.notifyEnabled"
              :disabled="row.status === '已解绑'"
              @change="handleToggleNotify(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === '有效'"
              type="danger" link size="small"
              @click="() => { row.status = '已解绑'; ElMessage.success('已解除绑定') }"
            >解绑</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="table-pagination">
        <el-pagination layout="total, prev, pager, next" :total="filtered.length" :page-size="10" />
      </div>
    </el-card>

    <!-- 新增绑定弹窗 -->
    <el-dialog v-model="dialogVisible" title="新增家属绑定" width="480px">
      <el-form label-width="90px">
        <el-form-item label="长辈手机号">
          <el-input placeholder="请输入长辈注册手机号" />
        </el-form-item>
        <el-form-item label="家属手机号">
          <el-input placeholder="请输入家属注册手机号" />
        </el-form-item>
        <el-form-item label="关系">
          <el-select placeholder="请选择" style="width: 100%">
            <el-option label="儿子" value="儿子" />
            <el-option label="女儿" value="女儿" />
            <el-option label="配偶" value="配偶" />
            <el-option label="孙子/孙女" value="孙子/孙女" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="dialogVisible = false">确认绑定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.family-page { max-width: 1200px; }
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
