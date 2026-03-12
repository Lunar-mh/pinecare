const STORAGE_KEYS = {
  apiBase: 'volunteer_api_base',
  token: 'volunteer_token',
  userInfo: 'volunteer_user_info',
}

const DEFAULT_API_BASE = 'http://127.0.0.1:3001/api/v1'
const TASK_FILTERS = ['all', 'pending', 'assigned', 'processing', 'completed']

const state = {
  apiBase: localStorage.getItem(STORAGE_KEYS.apiBase) || DEFAULT_API_BASE,
  token: localStorage.getItem(STORAGE_KEYS.token) || '',
  userInfo: readJson(STORAGE_KEYS.userInfo),
  profile: null,
  tasks: [],
  training: [],
  loading: false,
  error: '',
  activeTab: 'home',
  taskFilter: 'all',
  taskActionId: null,
  login: {
    phone: '',
    code: '',
    sendingSms: false,
    loggingIn: false,
    countdown: 0,
  },
}

let countdownTimer = null
const app = document.getElementById('app')

function readJson(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (_error) {
    return null
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDateTime(value) {
  if (!value) return '暂无时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return escapeHtml(value)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTaskStatus(status) {
  const map = {
    pending: '待接单',
    assigned: '已接单',
    processing: '服务中',
    completed: '已完成',
  }
  return map[status] || status
}

function formatTrainingStatus(status) {
  const map = {
    completed: '已通过',
    pending: '待完成',
    expired: '已过期',
  }
  return map[status] || status || '未知状态'
}

function badgeClass(status) {
  if (status === 'pending') return 'panel__badge panel__badge--warning'
  if (status === 'assigned' || status === 'processing') return 'panel__badge panel__badge--primary'
  if (status === 'completed') return 'panel__badge panel__badge--success'
  return 'panel__badge'
}

function buildUrl(path, params) {
  const url = new URL(`${state.apiBase}${path}`)
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  return url.toString()
}

function getUserFacingRequestMessage(status, code) {
  const mergedCode = Number(code || status || 0)
  if (mergedCode === 400 || mergedCode === 422) return '提交的信息有误，请检查后重试。'
  if (mergedCode === 401) return '登录状态已失效，请重新登录。'
  if (mergedCode === 403) return '当前账号暂无该操作权限。'
  if (mergedCode === 404) return '请求的数据不存在。'
  if (mergedCode === 409) return '数据状态已变化，请刷新后重试。'
  if (mergedCode === 429) return '操作过于频繁，请稍后再试。'
  if (mergedCode === 503 || mergedCode === 504) return '服务暂时不可用，请稍后再试。'
  return '请求失败，请稍后重试。'
}

function createRequestError(message, options = {}) {
  const error = new Error(message)
  error.code = options.code || null
  error.statusCode = options.statusCode || null
  error.debugMessage = options.debugMessage || ''
  return error
}


async function request(path, options = {}) {
  const { method = 'GET', body, auth = true, query } = options
  const headers = { 'Content-Type': 'application/json' }
  if (auth && state.token) {
    headers.Authorization = Bearer 
  }

  let response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    throw createRequestError('网络异常，请检查连接后重试。', {
      debugMessage: error instanceof Error ? error.message : String(error || ''),
    })
  }

  const payload = await response.json().catch(() => null)
  if (response.status === 401) {
    logout(false)
    throw createRequestError('登录状态已失效，请重新登录。', {
      code: payload && payload.code,
      statusCode: response.status,
      debugMessage: payload && payload.message,
    })
  }

  if (!response.ok) {
    throw createRequestError(getUserFacingRequestMessage(response.status, payload && payload.code), {
      code: payload && payload.code,
      statusCode: response.status,
      debugMessage: payload && payload.message,
    })
  }

  if (!payload || payload.code !== 0) {
    throw createRequestError(getUserFacingRequestMessage(payload && payload.code, response.status), {
      code: payload && payload.code,
      statusCode: response.status,
      debugMessage: payload && payload.message,
    })
  }

  return payload.data
}

function saveApiBase() {
  localStorage.setItem(STORAGE_KEYS.apiBase, state.apiBase)
}

function saveSession(token, userInfo) {
  state.token = token
  state.userInfo = userInfo || null
  localStorage.setItem(STORAGE_KEYS.token, token)
  localStorage.setItem(STORAGE_KEYS.userInfo, JSON.stringify(userInfo || null))
}

function logout(renderNow = true) {
  state.token = ''
  state.userInfo = null
  state.profile = null
  state.tasks = []
  state.training = []
  state.activeTab = 'home'
  state.taskFilter = 'all'
  localStorage.removeItem(STORAGE_KEYS.token)
  localStorage.removeItem(STORAGE_KEYS.userInfo)
  if (renderNow) render()
}

function setError(message) {
  state.error = message || ''
  render()
}

function clearError() {
  if (state.error) {
    state.error = ''
    render()
  }
}

function getTaskSummary() {
  return state.profile && state.profile.task_summary
    ? state.profile.task_summary
    : { available_count: 0, assigned_count: 0, processing_count: 0, completed_count: 0 }
}

async function loadVolunteerData() {
  if (!state.token) {
    render()
    return
  }
  state.loading = true
  render()
  try {
    const [profile, tasksResult, trainingResult] = await Promise.all([
      request('/volunteer/profile'),
      request('/volunteer/tasks', { query: { page: 1, pageSize: 100 } }),
      request('/volunteer/training', { query: { page: 1, pageSize: 20 } }),
    ])
    state.profile = profile
    state.tasks = tasksResult.list || []
    state.training = trainingResult.list || []
    state.error = ''
  } catch (error) {
    state.error = error instanceof Error ? error.message : '加载志愿者数据失败。'
  } finally {
    state.loading = false
    render()
  }
}

function startCountdown(seconds) {
  if (countdownTimer) clearInterval(countdownTimer)
  state.login.countdown = seconds
  countdownTimer = setInterval(() => {
    state.login.countdown -= 1
    if (state.login.countdown <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
      state.login.countdown = 0
    }
    render()
  }, 1000)
}

async function sendSmsCode() {
  if (state.login.sendingSms || state.login.countdown > 0) return
  const phone = state.login.phone.trim()
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    setError('请输入正确的手机号后再发送验证码。')
    return
  }

  state.login.sendingSms = true
  render()
  try {
    await request('/auth/sms-code', {
      method: 'POST',
      auth: false,
      body: { phone, purpose: 'login' },
    })
    state.error = ''
    startCountdown(60)
  } catch (error) {
    setError(error instanceof Error ? error.message : '验证码发送失败。')
  } finally {
    state.login.sendingSms = false
    render()
  }
}

async function loginVolunteer() {
  if (state.login.loggingIn) return
  const phone = state.login.phone.trim()
  const code = state.login.code.trim()
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    setError('请输入正确的手机号。')
    return
  }
  if (!/^\d{6}$/.test(code)) {
    setError('请输入 6 位验证码。')
    return
  }

  state.login.loggingIn = true
  render()
  try {
    const result = await request('/auth/phone', {
      method: 'POST',
      auth: false,
      body: { phone, code },
    })
    saveSession(result.token, result.userInfo)
    state.login.code = ''
    state.error = ''
    await loadVolunteerData()
  } catch (error) {
    setError(error instanceof Error ? error.message : '登录失败。')
  } finally {
    state.login.loggingIn = false
    render()
  }
}

async function runTaskAction(taskId, action) {
  if (state.taskActionId) return
  state.taskActionId = `${taskId}:${action}`
  render()
  try {
    const path = {
      accept: `/volunteer/tasks/${taskId}/accept`,
      checkIn: `/volunteer/tasks/${taskId}/check-in`,
      checkOut: `/volunteer/tasks/${taskId}/check-out`,
      complete: `/volunteer/tasks/${taskId}/complete`,
    }[action]
    await request(path, { method: 'POST', body: {} })
    state.error = ''
    await loadVolunteerData()
  } catch (error) {
    setError(error instanceof Error ? error.message : '任务操作失败。')
  } finally {
    state.taskActionId = null
    render()
  }
}

function renderLogin() {
  return `
    <main class="app-shell app-shell--auth">
      <section class="hero hero--auth">
        <span class="hero__eyebrow">志愿者工作台</span>
        <h1 class="hero__title">用同一套后端闭环承接接单、签到、签退和完成服务</h1>
        <p class="hero__desc">登录后会自动恢复志愿者身份、任务列表、培训记录和当前工作状态。</p>
      </section>

      <section class="panel form-card">
        <div class="section__title">登录与环境</div>
        <div class="section__desc">默认连接本地联调后端；需要切换环境时可直接修改 API 地址。</div>

        <label class="form-field">
          <span class="form-field__label">API 地址</span>
          <input class="form-field__input" data-field="apiBase" value="${escapeHtml(state.apiBase)}" placeholder="http://127.0.0.1:3001/api/v1" />
        </label>
        <label class="form-field">
          <span class="form-field__label">手机号</span>
          <input class="form-field__input" data-field="phone" value="${escapeHtml(state.login.phone)}" placeholder="请输入志愿者手机号" inputmode="numeric" />
        </label>
        <label class="form-field">
          <span class="form-field__label">验证码</span>
          <div class="form-field__row">
            <input class="form-field__input" data-field="code" value="${escapeHtml(state.login.code)}" placeholder="请输入 6 位验证码" inputmode="numeric" />
            <button class="ghost-button" data-action="send-code">${state.login.countdown > 0 ? `${state.login.countdown}s` : state.login.sendingSms ? '发送中...' : '发送验证码'}</button>
          </div>
        </label>

        <div class="notice notice--info">开发环境可继续使用固定验证码 000000。</div>
        <button class="primary-button primary-button--full" data-action="login">${state.login.loggingIn ? '登录中...' : '进入志愿者端'}</button>
      </section>
    </main>
  `
}

function renderSummaryCards() {
  const summary = getTaskSummary()
  const trainingPending = state.training.filter((item) => item.training_status !== 'completed').length
  return `
    <section class="metrics">
      <article class="metric"><div class="metric__label">待接单</div><div class="metric__value">${summary.available_count}</div><div class="metric__hint">本社区当前可领取任务</div></article>
      <article class="metric"><div class="metric__label">已接单</div><div class="metric__value">${summary.assigned_count}</div><div class="metric__hint">等待签到或准备出发</div></article>
      <article class="metric"><div class="metric__label">服务中</div><div class="metric__value">${summary.processing_count}</div><div class="metric__hint">正在执行中的照护任务</div></article>
      <article class="metric"><div class="metric__label">培训待跟进</div><div class="metric__value">${trainingPending}</div><div class="metric__hint">建议优先补齐的培训记录</div></article>
    </section>
  `
}

function buildTaskActions(task) {
  const buttons = []
  if (task.status === 'pending') {
    buttons.push({ key: 'accept', label: '接单', tone: 'primary' })
  }
  if (task.status === 'assigned') {
    buttons.push({ key: 'checkIn', label: '签到', tone: 'primary' })
    buttons.push({ key: 'complete', label: '直接完成', tone: 'success' })
  }
  if (task.status === 'processing') {
    buttons.push({ key: 'checkOut', label: '签退', tone: 'warning' })
    buttons.push({ key: 'complete', label: '完成任务', tone: 'success' })
  }
  return buttons
    .map((button) => {
      const active = state.taskActionId === `${task.id}:${button.key}`
      return `<button class="action-button action-button--${button.tone}" data-action="task" data-task-id="${task.id}" data-task-op="${button.key}">${active ? '处理中...' : button.label}</button>`
    })
    .join('')
}

function renderTaskCard(task) {
  return `
    <article class="panel task-card">
      <div class="task-card__header">
        <div>
          <div class="panel__title">${escapeHtml(task.service_type)} · ${escapeHtml(task.elder_name || '待分配老人')}</div>
          <div class="panel__meta">工单 ${escapeHtml(task.order_no)} · 手机 ${escapeHtml(task.elder_phone || '未填写')}</div>
        </div>
        <span class="${badgeClass(task.status)}">${formatTaskStatus(task.status)}</span>
      </div>
      <div class="task-card__meta-grid">
        <div><span>计划时间</span><strong>${formatDateTime(task.scheduled_at || task.created_at)}</strong></div>
        <div><span>完成时间</span><strong>${formatDateTime(task.completed_at || '')}</strong></div>
      </div>
      <div class="task-card__actions">${buildTaskActions(task) || '<span class="task-card__done">当前状态无需额外操作</span>'}</div>
    </article>
  `
}

function renderTaskSections() {
  const list = state.tasks.filter((task) => state.taskFilter === 'all' || task.status === state.taskFilter)
  if (list.length === 0) {
    return '<div class="empty-state">当前筛选条件下没有任务，先到首页刷新看看最新派单。</div>'
  }

  return list.map(renderTaskCard).join('')
}

function renderTraining() {
  if (!state.training.length) {
    return '<div class="empty-state">当前没有培训记录，后续补充的课程会自动同步到这里。</div>'
  }

  return state.training.map((item) => `
    <article class="panel training-card">
      <div class="task-card__header">
        <div>
          <div class="panel__title">${escapeHtml(item.training_title)}</div>
          <div class="panel__meta">培训时间 ${formatDateTime(item.training_at)}</div>
        </div>
        <span class="${badgeClass(item.training_status === 'completed' ? 'completed' : 'pending')}">${formatTrainingStatus(item.training_status)}</span>
      </div>
      <div class="task-card__meta-grid">
        <div><span>有效期至</span><strong>${formatDateTime(item.expires_at)}</strong></div>
        <div><span>证书链接</span><strong>${item.certificate_url ? '已登记' : '暂无'}</strong></div>
      </div>
    </article>
  `).join('')
}

function renderHome() {
  const nextTasks = state.tasks.filter((item) => item.status === 'assigned' || item.status === 'processing').slice(0, 3)
  return `
    <section class="hero">
      <span class="hero__eyebrow">今日任务态势</span>
      <h1 class="hero__title">${escapeHtml(state.profile?.name || '志愿者')}，把接单、签到和完成服务都收在一个入口里</h1>
      <p class="hero__desc">所属社区：${escapeHtml(state.profile?.community_id || '--')} · 当前角色：${escapeHtml(state.profile?.role || 'volunteer')} · Build: ${escapeHtml(window.__BUILD_TIME__ || 'dev')}</p>
    </section>
    ${renderSummaryCards()}
    <section class="section">
      <div class="section__title">优先处理</div>
      <div class="section__desc">先看已接单和服务中的任务，保证签到和处置链路完整。</div>
      ${nextTasks.length ? nextTasks.map(renderTaskCard).join('') : '<div class="empty-state">当前没有需要立刻处理的任务，可以去任务页查看待接单列表。</div>'}
    </section>
  `
}

function renderTasks() {
  return `
    <section class="hero hero--compact">
      <span class="hero__eyebrow">任务执行闭环</span>
      <h1 class="hero__title">任务、签到、签退、完成都在这一页</h1>
      <p class="hero__desc">只展示与你相关的可接任务和已分配任务，避免出现越权数据。</p>
    </section>
    <section class="section">
      <div class="filter-row">
        ${TASK_FILTERS.map((filter) => `<button class="filter-chip ${state.taskFilter === filter ? 'filter-chip--active' : ''}" data-action="task-filter" data-task-filter="${filter}">${({ all: '全部', pending: '待接单', assigned: '已接单', processing: '服务中', completed: '已完成' })[filter]}</button>`).join('')}
      </div>
      ${renderTaskSections()}
    </section>
  `
}

function renderProfile() {
  return `
    <section class="hero hero--compact">
      <span class="hero__eyebrow">我的资料</span>
      <h1 class="hero__title">个人身份、任务摘要和培训记录</h1>
      <p class="hero__desc">登录态会自动恢复，下次打开仍能继续当前工作。</p>
    </section>
    <section class="card-grid">
      <article class="card"><div class="card__title">姓名</div><div class="card__desc">${escapeHtml(state.profile?.name || '--')}</div><div class="card__tag">志愿者</div></article>
      <article class="card"><div class="card__title">手机号</div><div class="card__desc">${escapeHtml(state.profile?.phone || '--')}</div><div class="card__tag">登录账号</div></article>
      <article class="card"><div class="card__title">加入时间</div><div class="card__desc">${formatDateTime(state.profile?.joined_at)}</div><div class="card__tag">社区成员</div></article>
      <article class="card"><div class="card__title">完成任务</div><div class="card__desc">${getTaskSummary().completed_count} 单</div><div class="card__tag">时间银行已联动</div></article>
    </section>
    <section class="section">
      <div class="section__title">培训记录</div>
      <div class="section__desc">补齐培训和证书后，这里会自动同步最新状态。</div>
      ${renderTraining()}
      <button class="ghost-button ghost-button--danger" data-action="logout">退出登录</button>
    </section>
  `
}

function renderApp() {
  const tabContent = state.activeTab === 'tasks' ? renderTasks() : state.activeTab === 'profile' ? renderProfile() : renderHome()
  return `
    <main class="app-shell">
      ${state.error ? `<div class="notice notice--danger">${escapeHtml(state.error)}</div>` : ''}
      ${state.loading ? '<div class="notice notice--info">正在同步志愿者数据...</div>' : ''}
      <div class="toolbar">
        <div class="toolbar__meta">当前 API：${escapeHtml(state.apiBase)}</div>
        <div class="toolbar__actions">
          <button class="ghost-button" data-action="refresh">刷新数据</button>
        </div>
      </div>
      ${tabContent}
      <nav class="bottom-nav">
        <button class="bottom-nav__item ${state.activeTab === 'home' ? 'bottom-nav__item--active' : ''}" data-action="tab" data-tab="home">首页</button>
        <button class="bottom-nav__item ${state.activeTab === 'tasks' ? 'bottom-nav__item--active' : ''}" data-action="tab" data-tab="tasks">任务</button>
        <button class="bottom-nav__item ${state.activeTab === 'profile' ? 'bottom-nav__item--active' : ''}" data-action="tab" data-tab="profile">我的</button>
      </nav>
    </main>
  `
}

function render() {
  app.innerHTML = state.token ? renderApp() : renderLogin()
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]')
  if (!target) return
  const { action } = target.dataset

  if (action === 'tab') {
    state.activeTab = target.dataset.tab
    render()
    return
  }

  if (action === 'task-filter') {
    state.taskFilter = target.dataset.taskFilter || 'all'
    render()
    return
  }

  if (action === 'send-code') {
    sendSmsCode()
    return
  }

  if (action === 'login') {
    loginVolunteer()
    return
  }

  if (action === 'refresh') {
    loadVolunteerData()
    return
  }

  if (action === 'logout') {
    logout(true)
    return
  }

  if (action === 'task') {
    runTaskAction(target.dataset.taskId, target.dataset.taskOp)
  }
})

app.addEventListener('input', (event) => {
  const target = event.target
  const field = target.dataset.field
  if (!field) return

  if (field === 'apiBase') {
    state.apiBase = target.value.trim() || DEFAULT_API_BASE
    saveApiBase()
  }
  if (field === 'phone') state.login.phone = target.value
  if (field === 'code') state.login.code = target.value
})

render()
if (state.token) {
  loadVolunteerData()
}


