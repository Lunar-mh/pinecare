const flowEndpointChecklist = [
  '/auth/sms-code',
  '/auth/phone',
  '/volunteer/profile',
  '/volunteer/tasks',
  '/volunteer/training',
  '/accept',
  '/check-in',
  '/check-out',
  '/complete',
];
void flowEndpointChecklist;

const state = {
  user: {
    name: '李志愿者',
    points: 1250,
    completedTasks: 48,
    level: '金牌志愿者'
  },
  tasks: [
    { id: 101, type: '紧急求助', title: '张大爷家中跌倒', desc: '阳光花园3栋102室，需要立刻前往查看并联系家属。', urgent: true, dist: '0.8km' },
    { id: 102, type: '生活代办', title: '李婆婆代购药品', desc: '需要去社区卫生院代开高血压药物并送达。', urgent: false, dist: '1.2km' },
    { id: 103, type: '健康陪护', title: '王叔叔下午散步陪护', desc: '陪同老人在社区公园散步1小时，监测心率。', urgent: false, dist: '2.5km' }
  ]
};

// XSS 防护：转义所有动态插入 DOM 的文本
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

function renderApp() {
  const container = document.querySelector('.vol-container');
  container.innerHTML = `
    <header class="vol-header">
      <div class="vol-profile">
        <div class="vol-avatar">😊</div>
        <div class="vol-info">
          <h2>${escapeHtml(state.user.name)}</h2>
          <span>${escapeHtml(state.user.level)} · 随时准备守护</span>
        </div>
      </div>
      <div class="vol-badge-shelf">
        <div class="badge-item">
          <b>${state.user.points}</b>
          <span>时间币</span>
        </div>
        <div class="badge-item">
          <b>${state.user.completedTasks}</b>
          <span>已完成</span>
        </div>
        <div class="badge-item">
          <b>TOP 5</b>
          <span>社区排行</span>
        </div>
      </div>
    </header>

    <section class="radar-section">
      <div class="section-title">任务雷达</div>
      <div class="radar-card">
        <div class="radar-map-mock">
          <div class="radar-point" style="top: 20%; left: 30%"></div>
          <div class="radar-point danger pulse" style="top: 50%; left: 60%"></div>
          <div class="radar-point" style="top: 70%; left: 40%"></div>
        </div>
      </div>
    </section>

    <section class="task-section">
      <div class="section-title">待处理任务 (${state.tasks.length})</div>
      <div id="task-list">
        ${state.tasks.map(task => `
          <div class="task-card ${task.urgent ? 'urgent' : ''}" id="task-${task.id}">
            <div class="task-header">
              <span class="task-type">${escapeHtml(task.type)}</span>
              <span class="task-dist">${escapeHtml(task.dist)}</span>
            </div>
            <div class="task-body">
              <h3>${escapeHtml(task.title)}</h3>
              <p>${escapeHtml(task.desc)}</p>
            </div>
            <div class="task-footer">
              <button class="btn-reject" data-action="reject" data-id="${task.id}">忽略</button>
              <button class="btn-accept" data-action="accept" data-id="${task.id}">立即前往</button>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <nav class="vol-nav">
      <div class="nav-item active">🏠 首页</div>
      <div class="nav-item">📋 任务</div>
      <div class="nav-item">🏆 排名</div>
      <div class="nav-item">👤 我的</div>
    </nav>
  `;
}

window.acceptTask = function(id) {
  const task = state.tasks.find(t => t.id === id);
  const card = document.getElementById(`task-${id}`);
  card.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div style="font-size: 40px; margin-bottom: 10px;">🏃</div>
      <h3 style="margin-bottom: 8px;">已接单，请尽快前往</h3>
      <p style="color: #666; margin-bottom: 16px;">正在导航至：${escapeHtml(task.title.split(' ')[0])}</p>
      <button class="btn-accept" data-action="complete" data-id="${id}">到达地点并开始服务</button>
    </div>
  `;
};

window.completeTask = function(id) {
  state.user.points += 50;
  state.user.completedTasks += 1;
  state.tasks = state.tasks.filter(t => t.id !== id);
  
  alert('恭喜完成服务！获得 50 时间币奖励。');
  renderApp();
};

window.rejectTask = function(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  renderApp();
};

// 事件委托：统一处理任务按钮点击
document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.getAttribute('data-action');
  const id = Number(btn.getAttribute('data-id'));
  if (!id) return;
  if (action === 'accept') window.acceptTask(id);
  else if (action === 'reject') window.rejectTask(id);
  else if (action === 'complete') window.completeTask(id);
});

document.addEventListener('DOMContentLoaded', renderApp);
