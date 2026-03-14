<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Download, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createUser, getUserDetail, getUsers, updateUserStatus } from '@/services'
import type { UserItem, UserRole, UserStatus } from '@/services'

const router = useRouter()
const loading = ref(false)
const creating = ref(false)
const togglingId = ref<number | null>(null)

const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const users = ref<UserItem[]>([])

const search = ref('')
const roleFilter = ref<UserRole | ''>('')
const statusFilter = ref<UserStatus | ''>('')

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<UserItem | null>(null)

const createVisible = ref(false)
const createForm = reactive<{ nickname: string; phone: string; role: UserRole }>({
  nickname: '',
  phone: '',
  role: 'elder',
})

const pageStats = computed(() => {
  const active = users.value.filter((item) => item.status === '正常').length
  const disabled = users.value.filter((item) => item.status === '禁用').length
  const family = users.value.filter((item) => item.role === 'family').length
  const elder = users.value.filter((item) => item.role === 'elder').length
  return { active, disabled, family, elder }
})

function roleLabel(role: UserRole): string {
  return role === 'family' ? '家属' : '长辈'
}

function statusTagType(status: string): 'success' | 'warning' | 'info' {
  if (status === '正常') return 'success'
  if (status === '禁用') return 'warning'
  return 'info'
}

async function fetchUsers(): Promise<void> {
  loading.value = true
  try {
    const data = await getUsers({
      page: page.value,
      pageSize: pageSize.value,
      search: search.value || undefined,
      role: roleFilter.value || undefined,
      status: statusFilter.value || undefined,
    })
    users.value = data.list || []
    total.value = Number(data.total || 0)
    page.value = Number(data.page || page.value)
    pageSize.value = Number(data.pageSize || pageSize.value)
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '用户列表加载失败')
    users.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function openDetail(userId: number): Promise<void> {
  detailVisible.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await getUserDetail(userId)
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '用户详情加载失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

function resetCreateForm(): void {
  createForm.nickname = ''
  createForm.phone = ''
  createForm.role = 'elder'
}

async function submitCreate(): Promise<void> {
  if (!createForm.nickname.trim() || !createForm.phone.trim()) {
    ElMessage.warning('请填写昵称和手机号')
    return
  }
  if (!/^1[3-9]\d{9}$/.test(createForm.phone.trim())) {
    ElMessage.warning('请输入有效的11位手机号')
    return
  }

  creating.value = true
  try {
    await createUser({
      nickname: createForm.nickname.trim(),
      phone: createForm.phone.trim(),
      role: createForm.role,
    })
    ElMessage.success('用户创建成功')
    createVisible.value = false
    resetCreateForm()
    page.value = 1
    await fetchUsers()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err.message || '创建用户失败')
  } finally {
    creating.value = false
  }
}

async function toggleStatus(row: UserItem): Promise<void> {
  const nextStatus: UserStatus = row.status === '正常' ? '禁用' : '正常'
  const actionText = nextStatus === '禁用' ? '禁用' : '启用'

  try {
    await ElMessageBox.confirm(`确定要${actionText}用户「${row.nickname}」吗？`, '确认操作', {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  togglingId.value = row.id
  try {
    await updateUserStatus(row.id, nextStatus)
    ElMessage.success(`用户已${actionText}`)
    await fetchUsers()
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '状态更新失败')
  } finally {
    togglingId.value = null
  }
}

function exportCurrentPage(): void {
  const header = 'ID,昵称,手机号,角色,状态,注册日期,最近活跃'
  const body = users.value
    .map((item) => [item.id, item.nickname, item.phone, roleLabel(item.role), item.status, item.registerDate, item.lastActive].join(','))
    .join('\n')
  const csv = `${header}\n${body}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `admin-users-page-${page.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('已导出当前页用户数据')
}

function gotoHealth(userId: number): void {
  void router.push({ path: '/health', query: { userId: String(userId) } })
}

watch([search, roleFilter, statusFilter], () => {
  page.value = 1
  void fetchUsers()
})

onMounted(() => {
  void fetchUsers()
})
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">用户管理</span>
        <span class="wb-page-subtitle">用户列表、新增、启停与详情统一在一页完成，所有动作直接写入后端。</span>
      </div>
      <div style="display:flex; gap: 10px;">
        <el-button :icon="Refresh" @click="fetchUsers">刷新</el-button>
        <el-button :icon="Download" @click="exportCurrentPage">导出当前页</el-button>
        <el-button type="primary" :icon="Plus" @click="createVisible = true">新增用户</el-button>
      </div>
    </div>

    <div class="wb-metric-grid">
      <div class="wb-metric-card">
        <span class="wb-card-label">当前查询总数</span>
        <div class="wb-card-value">{{ total }}</div>
        <span class="wb-card-hint">匹配筛选条件的用户总量</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">当前页正常</span>
        <div class="wb-card-value">{{ pageStats.active }}</div>
        <span class="wb-card-hint">可正常登录和使用</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">当前页禁用</span>
        <div class="wb-card-value">{{ pageStats.disabled }}</div>
        <span class="wb-card-hint">已被运营侧禁用</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">当前页角色</span>
        <div class="wb-card-value">{{ pageStats.elder }}/{{ pageStats.family }}</div>
        <span class="wb-card-hint">长辈/家属分布</span>
      </div>
    </div>

    <div class="wb-filter-card" style="margin-bottom: 20px;">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input v-model="search" :prefix-icon="Search" placeholder="搜索昵称、手机号或用户ID" clearable />
        </el-col>
        <el-col :span="4">
          <el-select v-model="roleFilter" placeholder="角色" clearable style="width: 100%">
            <el-option label="长辈" value="elder" />
            <el-option label="家属" value="family" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 100%">
            <el-option label="正常" value="正常" />
            <el-option label="禁用" value="禁用" />
          </el-select>
        </el-col>
      </el-row>
    </div>

    <div class="wb-panel">
      <el-table :data="users" stripe v-loading="loading">
        <template #empty>
          <div style="padding: 28px; text-align: center; color: var(--wb-text-soft)">
            {{ loading ? '加载中...' : '暂无用户数据' }}
          </div>
        </template>
        <el-table-column prop="id" label="用户ID" width="90" />
        <el-table-column prop="nickname" label="昵称" min-width="140" />
        <el-table-column prop="phone" label="手机号" width="150" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'family' ? 'warning' : 'success'">{{ roleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="age" label="年龄" width="80" />
        <el-table-column prop="registerDate" label="注册日期" width="120" />
        <el-table-column prop="lastActive" label="最近活跃" min-width="150" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDetail(row.id)">详情</el-button>
            <el-button type="success" link @click="gotoHealth(row.id)">健康趋势</el-button>
            <el-button type="warning" link :loading="togglingId === row.id" @click="toggleStatus(row)">
              {{ row.status === '正常' ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="display: flex; justify-content: flex-end; margin-top: 16px">
        <el-pagination
          v-model:current-page="page"
          layout="total, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          @current-change="fetchUsers"
        />
      </div>
    </div>

    <el-dialog v-model="createVisible" title="新增用户" width="520px" @closed="resetCreateForm">
      <el-form label-width="100px">
        <el-form-item label="昵称">
          <el-input v-model="createForm.nickname" maxlength="32" show-word-limit />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="createForm.phone" maxlength="11" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="createForm.role" style="width: 100%">
            <el-option label="长辈" value="elder" />
            <el-option label="家属" value="family" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="用户详情" size="420px">
      <template v-if="detail">
        <div class="wb-list" v-loading="detailLoading">
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">基础信息</span>
              <span class="wb-list-desc">{{ detail.nickname }} / {{ detail.phone }}</span>
            </div>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">角色与状态</span>
              <span class="wb-list-desc">{{ roleLabel(detail.role) }} / {{ detail.status }}</span>
            </div>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">注册与活跃</span>
              <span class="wb-list-desc">{{ detail.registerDate }} / {{ detail.lastActive }}</span>
            </div>
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>
