<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUsers, updateUserStatus, createUser, getUserDetail } from '@/services'
import type { UserItem, UserStatus } from '@/services'

const searchText = ref('')
const filterRole = ref<'elder' | 'family' | ''>('')
const filterStatus = ref<UserStatus | ''>('')
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

const elderCount = computed(() => users.value.filter((u) => u.role === 'elder').length)
const familyCount = computed(() => users.value.filter((u) => u.role === 'family').length)
const disabledCount = computed(() => users.value.filter((u) => u.status === '禁用').length)

const roleLabel = (role: string) => (role === 'elder' ? '长辈' : '家属')
const roleTagType = (role: string) => (role === 'elder' ? 'primary' : 'success')
const statusTagType = (status: UserStatus) => (status === '正常' ? 'success' : 'danger')

async function fetchUsers() {
  tableLoading.value = true
  try {
    const res = await getUsers({
      page: page.value,
      pageSize: pageSize.value,
      search: searchText.value || undefined,
      role: filterRole.value || undefined,
      status: filterStatus.value || undefined,
    })
    users.value = res.list
    total.value = res.total
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '加载用户失败'
    ElMessage.error(message)
    users.value = []
    total.value = 0
  } finally {
    tableLoading.value = false
  }
}

onMounted(fetchUsers)

watch([searchText, filterRole, filterStatus], () => {
  page.value = 1
  fetchUsers()
})

async function handleViewDetail(row: UserItem) {
  try {
    selectedUser.value = await getUserDetail(row.id)
  } catch {
    selectedUser.value = row
  }
  detailVisible.value = true
}

async function handleToggleStatus(row: UserItem) {
  const newStatus: UserStatus = row.status === '正常' ? '禁用' : '正常'
  const action = newStatus === '禁用' ? '禁用' : '启用'

  try {
    await ElMessageBox.confirm(`确认${action}用户“${row.nickname}”吗？`, '确认操作', {
      confirmButtonText: action,
      cancelButtonText: '取消',
      type: 'warning',
    })

    await updateUserStatus(row.id, newStatus)
    ElMessage.success(`已${action}`)
    await fetchUsers()
  } catch (err: unknown) {
    if (err !== 'cancel') {
      const message = err instanceof Error ? err.message : `${action}失败`
      ElMessage.error(message)
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
    ElMessage.warning('请填写昵称和手机号')
    return
  }

  submitLoading.value = true
  try {
    await createUser({
      nickname: form.nickname,
      phone: form.phone,
      role: form.role,
    })
    ElMessage.success('用户已创建')
    dialogVisible.value = false
    page.value = 1
    await fetchUsers()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '创建用户失败'
    ElMessage.error(message)
  } finally {
    submitLoading.value = false
  }
}
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">用户管理</span>
        <span class="wb-page-subtitle">统一查看长辈与家属账户，重点关注身份、活跃度和可用状态。</span>
      </div>
      <el-button type="primary" :icon="Plus" round @click="handleAdd">新增用户</el-button>
    </div>

    <div class="wb-metric-grid">
      <div class="wb-metric-card">
        <span class="wb-card-label">总用户数</span>
        <div class="wb-card-value">{{ total }}</div>
        <span class="wb-card-hint">当前列表统计结果</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">长辈用户</span>
        <div class="wb-card-value">{{ elderCount }}</div>
        <span class="wb-card-hint">重点关注活跃和离线情况</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">家属用户</span>
        <div class="wb-card-value">{{ familyCount }}</div>
        <span class="wb-card-hint">关注绑定关系和协作动作</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">禁用账户</span>
        <div class="wb-card-value">{{ disabledCount }}</div>
        <span class="wb-card-hint">异常账号建议优先核查</span>
      </div>
    </div>

    <div class="wb-filter-card" style="margin-bottom: 20px">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input v-model="searchText" placeholder="搜索昵称、手机号或 ID" :prefix-icon="Search" clearable />
        </el-col>
        <el-col :span="5">
          <el-select v-model="filterRole" placeholder="身份角色" clearable style="width: 100%">
            <el-option label="长辈" value="elder" />
            <el-option label="家属" value="family" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-select v-model="filterStatus" placeholder="账户状态" clearable style="width: 100%">
            <el-option label="正常" value="正常" />
            <el-option label="禁用" value="禁用" />
          </el-select>
        </el-col>
      </el-row>
    </div>

    <div class="wb-panel">
      <el-table :data="users" stripe v-loading="tableLoading">
        <el-table-column prop="nickname" label="昵称" width="150" />
        <el-table-column prop="phone" label="手机号" width="160" />
        <el-table-column label="身份" width="110">
          <template #default="{ row }">
            <el-tag :type="roleTagType(row.role)">{{ roleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="age" label="年龄" width="90" />
        <el-table-column prop="registerDate" label="创建时间" width="140" />
        <el-table-column prop="lastActive" label="最近活跃" width="160" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleViewDetail(row)">详情</el-button>
            <el-button :type="row.status === '正常' ? 'warning' : 'success'" link @click="handleToggleStatus(row)">
              {{ row.status === '正常' ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="display: flex; justify-content: flex-end; margin-top: 18px">
        <el-pagination v-model:current-page="page" layout="total, prev, pager, next" :total="total" :page-size="pageSize" @current-change="fetchUsers" />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" title="新增用户" width="480px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="昵称"><el-input v-model="form.nickname" placeholder="请输入昵称" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" placeholder="请输入手机号" /></el-form-item>
        <el-form-item label="身份角色">
          <el-radio-group v-model="form.role">
            <el-radio value="elder">长辈</el-radio>
            <el-radio value="family">家属</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleConfirmAdd">确认创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="用户详情" width="540px">
      <el-descriptions v-if="selectedUser" :column="2" border>
        <el-descriptions-item label="昵称">{{ selectedUser.nickname }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ selectedUser.phone }}</el-descriptions-item>
        <el-descriptions-item label="身份">{{ roleLabel(selectedUser.role) }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ selectedUser.status }}</el-descriptions-item>
        <el-descriptions-item label="年龄">{{ selectedUser.age || '-' }}</el-descriptions-item>
        <el-descriptions-item label="地址">{{ selectedUser.address || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ selectedUser.registerDate }}</el-descriptions-item>
        <el-descriptions-item label="最近活跃">{{ selectedUser.lastActive }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>
