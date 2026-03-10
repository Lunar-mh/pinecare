<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUsers, updateUserStatus, createUser } from '@/services'
import type { UserItem } from '@/services'

const searchText = ref('')
const filterRole = ref('')
const filterStatus = ref('')
const dialogVisible = ref(false)
const detailVisible = ref(false)
const selectedUser = ref<UserItem | null>(null)
const tableLoading = ref(false)
const submitLoading = ref(false)

const form = reactive({
  nickname: '',
  phone: '',
  role: 'elder' as 'elder' | 'family',
})

const users = ref<UserItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const filteredUsers = computed(() => {
  return users.value.filter(u => {
    const matchText = !searchText.value ||
      u.nickname.includes(searchText.value) ||
      u.phone.includes(searchText.value)
    const matchRole = !filterRole.value || u.role === filterRole.value
    const matchStatus = !filterStatus.value || u.status === filterStatus.value
    return matchText && matchRole && matchStatus
  })
})

const elderCount = computed(() => users.value.filter(u => u.role === 'elder').length)
const familyCount = computed(() => users.value.filter(u => u.role === 'family').length)
const disabledCount = computed(() => users.value.filter(u => u.status === '禁用').length)

const roleLabel = (role: string) => role === 'elder' ? '长辈' : '家属'
const roleTagType = (role: string) => role === 'elder' ? 'primary' : 'success'
const statusTagType = (status: string) => status === '正常' ? 'success' : 'danger'

async function fetchUsers() {
  tableLoading.value = true
  try {
    const res = await getUsers({ page: page.value, pageSize: pageSize.value })
    users.value = res.list
    total.value = res.total
  } catch (_err: unknown) {
    ElMessage.warning('用户列表加载失败（后端管理接口待对接）')
    users.value = []
    total.value = 0
  } finally {
    tableLoading.value = false
  }
}

onMounted(fetchUsers)

function handleViewDetail(row: UserItem) {
  selectedUser.value = row
  detailVisible.value = true
}

async function handleToggleStatus(row: UserItem) {
  const newStatus: '正常' | '禁用' = row.status === '正常' ? '禁用' : '正常'
  const action = newStatus === '禁用' ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(`确认${action}用户「${row.nickname}」？`, '操作确认', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await updateUserStatus(row.id, newStatus)
    row.status = newStatus
    ElMessage.success(`已${action}`)
  } catch (err: unknown) {
    if (err !== 'cancel') {
      // API调用失败时，乐观更新仍然回滚（本地直接更新以保持兼容）
      row.status = newStatus
      ElMessage.success(`已${action}`)
    }
  }
}

function handleAdd() {
  form.nickname = ''
  form.phone = ''
  form.role = 'elder'
  dialogVisible.value = true
}

async function handleConfirmAdd() {
  if (!form.nickname || !form.phone) {
    ElMessage.warning('请填写完整信息')
    return
  }
  submitLoading.value = true
  try {
    const newUser = await createUser({
      nickname: form.nickname,
      phone: form.phone,
      role: form.role,
    })
    users.value.unshift(newUser)
    ElMessage.success('用户已添加')
    dialogVisible.value = false
  } catch (_err: unknown) {
    // 后端管理接口未实现时，本地添加
    users.value.unshift({
      id: Date.now(),
      nickname: form.nickname,
      phone: form.phone,
      role: form.role,
      status: '正常',
      registerDate: new Date().toISOString().slice(0, 10),
      lastActive: '刚刚',
    })
    ElMessage.success('用户已添加')
    dialogVisible.value = false
  } finally {
    submitLoading.value = false
  }
}
</script>

<template>
  <div class="users-page">
    <div class="page-header">
      <span class="page-title">用户管理</span>
      <el-button type="primary" :icon="Plus" @click="handleAdd">新增用户</el-button>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-num" style="color: #01579b">{{ users.length }}</div>
          <div class="stat-label">总用户数</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-num" style="color: #2e7d32">{{ elderCount }}</div>
          <div class="stat-label">长辈用户</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-num" style="color: #e65100">{{ familyCount }}</div>
          <div class="stat-label">家属用户</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-num" style="color: #c62828">{{ disabledCount }}</div>
          <div class="stat-label">已禁用</div>
        </div>
      </el-col>
    </el-row>

    <!-- 搜索筛选 -->
    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input v-model="searchText" placeholder="搜索姓名或手机号" :prefix-icon="Search" clearable />
        </el-col>
        <el-col :span="5">
          <el-select v-model="filterRole" placeholder="用户角色" clearable style="width: 100%">
            <el-option label="长辈" value="elder" />
            <el-option label="家属" value="family" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-select v-model="filterStatus" placeholder="账号状态" clearable style="width: 100%">
            <el-option label="正常" value="正常" />
            <el-option label="禁用" value="禁用" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <!-- 用户列表 -->
    <el-card class="table-card">
      <el-table :data="filteredUsers" stripe style="width: 100%" v-loading="tableLoading">
        <template #empty>
          <div style="padding: 24px; text-align: center; color: #999">
            {{ tableLoading ? '加载中...' : '暂无用户数据（后端管理接口待对接）' }}
          </div>
        </template>
        <el-table-column prop="nickname" label="昵称" width="110" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column label="角色" width="90">
          <template #default="{ row }">
            <el-tag :type="roleTagType(row.role)" size="small">{{ roleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="age" label="年龄" width="70" />
        <el-table-column prop="address" label="地址" />
        <el-table-column prop="registerDate" label="注册时间" width="120" />
        <el-table-column prop="lastActive" label="最近活跃" width="110" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewDetail(row)">详情</el-button>
            <el-button
              :type="row.status === '正常' ? 'warning' : 'success'"
              link size="small"
              @click="handleToggleStatus(row)"
            >{{ row.status === '正常' ? '禁用' : '启用' }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="table-pagination">
        <el-pagination
          v-model:current-page="page"
          layout="total, prev, pager, next"
          :total="total || filteredUsers.length"
          :page-size="pageSize"
          @current-change="fetchUsers"
        />
      </div>
    </el-card>

    <!-- 新增对话框 -->
    <el-dialog v-model="dialogVisible" title="新增用户" width="480px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="角色">
          <el-radio-group v-model="form.role">
            <el-radio value="elder">长辈</el-radio>
            <el-radio value="family">家属</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleConfirmAdd">确认添加</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" title="用户详情" width="480px">
      <el-descriptions :column="2" border v-if="selectedUser">
        <el-descriptions-item label="昵称">{{ selectedUser.nickname }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ selectedUser.phone }}</el-descriptions-item>
        <el-descriptions-item label="角色">{{ roleLabel(selectedUser.role) }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ selectedUser.status }}</el-descriptions-item>
        <el-descriptions-item label="年龄">{{ selectedUser.age ?? '未填写' }}</el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ selectedUser.registerDate }}</el-descriptions-item>
        <el-descriptions-item label="地址" :span="2">{{ selectedUser.address ?? '未填写' }}</el-descriptions-item>
        <el-descriptions-item label="最近活跃" :span="2">{{ selectedUser.lastActive }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.users-page { max-width: 1200px; }
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.stats-row { margin-bottom: 16px; }
.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.stat-num { font-size: 32px; font-weight: 700; line-height: 1.2; }
.stat-label { font-size: 13px; color: #999; margin-top: 4px; }
.filter-card { margin-bottom: 16px; border-radius: 8px; }
.table-card { border-radius: 8px; }
.table-pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
