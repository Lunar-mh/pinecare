const tabs = [
  { key: 'home', label: '首页' },
  { key: 'tasks', label: '任务' },
  { key: 'profile', label: '我的' },
]

const homeMetrics = [
  { label: '今日待办', value: '6', hint: '待接单 2，进行中 3，紧急协助 1' },
  { label: '今日工时', value: '3.5h', hint: '已签到 2 次，待签退 1 次' },
  { label: '紧急协助', value: '1', hint: '来自社区管理端派发的 SOS 协助任务' },
  { label: '培训通知', value: '2', hint: '本周需要完成的培训和签到提醒' },
]

const taskColumns = {
  pending: [
    { title: '助餐服务', meta: '09:30 - 社区 A 栋 2 单元', badge: '待接单', tone: 'warning' },
    { title: '陪诊协助', meta: '11:00 - 人民医院门诊楼', badge: '待接单', tone: 'warning' },
  ],
  active: [
    { title: '上门探访', meta: '进行中 · 预计 14:00 签退', badge: '进行中', tone: 'success' },
    { title: '药品代取', meta: '进行中 · 已完成取药', badge: '进行中', tone: 'success' },
  ],
  review: [
    { title: '家务协助', meta: '待服务对象确认工时', badge: '待确认', tone: 'warning' },
  ],
  done: [
    { title: '日常探访', meta: '昨天 16:30 已完成', badge: '已完成', tone: 'success' },
  ],
}

const profileCards = [
  { title: '本月工时', desc: '累计服务 28 小时，已确认 23 小时。', tag: '工时' },
  { title: '服务等级', desc: '当前为四星志愿者，差 2 分进入五星。', tag: '等级' },
  { title: '排班消息', desc: '本周还剩 3 个排班点位待确认。', tag: '排班' },
  { title: '培训提醒', desc: '周四需要完成急救培训签到。', tag: '培训' },
]

let activeTab = 'home'
const app = document.getElementById('app')

function badgeClass(tone) {
  return `panel__badge panel__badge--${tone}`
}

function renderHome() {
  return `
    <section class="hero">
      <span class="hero__eyebrow">志愿者端</span>
      <h1 class="hero__title">今天先看排班、待办和紧急协助</h1>
      <p class="hero__desc">志愿者端只保留执行任务必须的能力，不再混入长辈全量健康、家庭空间或社区配置。</p>
    </section>
    <section class="metrics">
      ${homeMetrics.map(item => `
        <article class="metric">
          <div class="metric__label">${item.label}</div>
          <div class="metric__value">${item.value}</div>
          <div class="metric__hint">${item.hint}</div>
        </article>
      `).join('')}
    </section>
    <section class="section">
      <div class="section__title">今日焦点</div>
      <div class="section__desc">首页只保留排班、签到、任务和紧急协助，帮助志愿者更快进入执行状态。</div>
      <div class="card-grid">
        <article class="card"><div class="card__title">今日排班</div><div class="card__desc">09:30 助餐，11:00 陪诊，14:30 上门探访。</div><div class="card__tag">排班</div></article>
        <article class="card"><div class="card__title">签到签退</div><div class="card__desc">签到信息和服务开始/结束动作收敛在同一路径。</div><div class="card__tag">签到</div></article>
        <article class="card"><div class="card__title">紧急协助</div><div class="card__desc">只有被派发给当前志愿者的 SOS 协助任务会出现在这里。</div><div class="card__tag">SOS</div></article>
        <article class="card"><div class="card__title">工时结算</div><div class="card__desc">服务完成后进入待确认，再进入工时和时长币结算。</div><div class="card__tag">结算</div></article>
      </div>
    </section>
  `
}

function renderTasks() {
  return `
    <section class="hero">
      <span class="hero__eyebrow">任务中心</span>
      <h1 class="hero__title">按任务状态，而不是按功能堆入口</h1>
      <p class="hero__desc">任务页固定分为待接单、进行中、待确认、已完成，帮助志愿者按执行阶段处理事务。</p>
    </section>
    <section class="section">
      <div class="section__title">待接单 / 进行中 / 待确认 / 已完成</div>
      <div class="section__desc">这是独立志愿者端的核心信息架构，避免和社区后台审核视角混在一起。</div>
      ${Object.entries(taskColumns).map(([key, items]) => `
        <article class="panel">
          <div class="section__title">${({ pending: '待接单', active: '进行中', review: '待确认', done: '已完成' })[key]}</div>
          ${items.map(item => `
            <div class="panel__row">
              <div>
                <div class="panel__title">${item.title}</div>
                <div class="panel__meta">${item.meta}</div>
              </div>
              <span class="${badgeClass(item.tone)}">${item.badge}</span>
            </div>
          `).join('')}
        </article>
      `).join('')}
    </section>
  `
}

function renderProfile() {
  return `
    <section class="hero">
      <span class="hero__eyebrow">我的</span>
      <h1 class="hero__title">工时、等级、培训和个人设置</h1>
      <p class="hero__desc">我的页只服务志愿者本人，不承担社区配置，也不展示长辈隐私信息。</p>
    </section>
    <section class="section">
      <div class="section__title">个人工作摘要</div>
      <div class="section__desc">将工时、等级、培训、消息和设置集中到个人中心。</div>
      <div class="card-grid">
        ${profileCards.map(item => `
          <article class="card">
            <div class="card__title">${item.title}</div>
            <div class="card__desc">${item.desc}</div>
            <div class="card__tag">${item.tag}</div>
          </article>
        `).join('')}
      </div>
      <div class="meta-note">Build: ${window.__BUILD_TIME__ || 'dev'}</div>
    </section>
  `
}

function renderTabContent() {
  if (activeTab === 'tasks') return renderTasks()
  if (activeTab === 'profile') return renderProfile()
  return renderHome()
}

function render() {
  app.innerHTML = `
    <main class="app-shell">
      ${renderTabContent()}
      <nav class="bottom-nav">
        ${tabs.map(tab => `<button class="bottom-nav__item ${tab.key === activeTab ? 'bottom-nav__item--active' : ''}" data-tab="${tab.key}">${tab.label}</button>`).join('')}
      </nav>
    </main>
  `

  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => {
      activeTab = button.getAttribute('data-tab')
      render()
    })
  })
}

render()