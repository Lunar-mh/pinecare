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

const roleLabel = (role: string) => (role === 'elder' ? 'Elder' : 'Family')
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
    const message = err instanceof Error ? err.message : 'Failed to load users.'
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
  } catch (_err: unknown) {
    selectedUser.value = row
  }
  detailVisible.value = true
}

async function handleToggleStatus(row: UserItem) {
  const newStatus: UserStatus = row.status === '正常' ? '禁用' : '正常'
  const action = newStatus === '禁用' ? 'disable' : 'enable'

  try {
    await ElMessageBox.confirm(
      `Confirm to ${action} user \"${row.nickname}\"?`,
      'Confirm',
      {
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }
    )

    await updateUserStatus(row.id, newStatus)
    ElMessage.success(`User ${action}d.`)
    await fetchUsers()
  } catch (err: unknown) {
    if (err !== 'cancel') {
      const message = err instanceof Error ? err.message : `Failed to ${action} user.`
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
    ElMessage.warning('Please enter nickname and phone.')
    return
  }

  submitLoading.value = true
  try {
    await createUser({
      nickname: form.nickname,
      phone: form.phone,
      role: form.role,
    })
    ElMessage.success('User created.')
    dialogVisible.value = false
    page.value = 1
    await fetchUsers()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Create user failed.'
    ElMessage.error(message)
  } finally {
    submitLoading.value = false
  }
}
</script>

<template>
  <div class="users-page">
    <div class="page-header">
      <span class="page-title">User Management</span>
      <el-button type="primary" :icon="Plus" @click="handleAdd">Create User</el-button>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-num" style="color: #01579b">{{ total }}</div>
          <div class="stat-label">Total</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-num" style="color: #2e7d32">{{ elderCount }}</div>
          <div class="stat-label">Elder</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-num" style="color: #e65100">{{ familyCount }}</div>
          <div class="stat-label">Family</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-num" style="color: #c62828">{{ disabledCount }}</div>
          <div class="stat-label">Disabled</div>
        </div>
      </el-col>
    </el-row>

    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input
            v-model="searchText"
            placeholder="Search by nickname, phone or ID"
            :prefix-icon="Search"
            clearable
          />
        </el-col>
        <el-col :span="5">
          <el-select v-model="filterRole" placeholder="Role" clearable style="width: 100%">
            <el-option label="Elder" value="elder" />
            <el-option label="Family" value="family" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-select v-model="filterStatus" placeholder="Status" clearable style="width: 100%">
            <el-option label="Normal" value="正常" />
            <el-option label="Disabled" value="禁用" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card">
      <el-table :data="users" stripe style="width: 100%" v-loading="tableLoading">
        <el-table-column prop="nickname" label="Nickname" width="130" />
        <el-table-column prop="phone" label="Phone" width="150" />
        <el-table-column label="Role" width="100">
          <template #default="{ row }">
            <el-tag :type="roleTagType(row.role)" size="small">{{ roleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="age" label="Age" width="80" />
        <el-table-column prop="registerDate" label="Created At" width="120" />
        <el-table-column prop="lastActive" label="Last Active" width="150" />
        <el-table-column label="Status" width="90">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewDetail(row)">Detail</el-button>
            <el-button
              :type="row.status === '正常' ? 'warning' : 'success'"
              link
              size="small"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === '正常' ? 'Disable' : 'Enable' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-pagination">
        <el-pagination
          v-model:current-page="page"
          layout="total, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          @current-change="fetchUsers"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" title="Create User" width="480px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="Nickname">
          <el-input v-model="form.nickname" placeholder="Enter nickname" />
        </el-form-item>
        <el-form-item label="Phone">
          <el-input v-model="form.phone" placeholder="Enter phone" />
        </el-form-item>
        <el-form-item label="Role">
          <el-radio-group v-model="form.role">
            <el-radio value="elder">Elder</el-radio>
            <el-radio value="family">Family</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleConfirmAdd">Confirm</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="User Detail" width="520px">
      <el-descriptions :column="2" border v-if="selectedUser">
        <el-descriptions-item label="Nickname">{{ selectedUser.nickname }}</el-descriptions-item>
        <el-descriptions-item label="Phone">{{ selectedUser.phone }}</el-descriptions-item>
        <el-descriptions-item label="Role">{{ roleLabel(selectedUser.role) }}</el-descriptions-item>
        <el-descriptions-item label="Status">{{ selectedUser.status }}</el-descriptions-item>
        <el-descriptions-item label="Age">{{ selectedUser.age ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="Created At">{{ selectedUser.registerDate }}</el-descriptions-item>
        <el-descriptions-item label="Last Active" :span="2">{{ selectedUser.lastActive }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">Close</el-button>
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
