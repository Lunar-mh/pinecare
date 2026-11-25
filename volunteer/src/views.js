/**
 * 青松安护（PineCare）志愿者工作台 - 视图渲染与交互手势组件
 */
import { API_BASE_CANDIDATES, state } from './state.js';
import {
  escapeHtml,
  getStatusLabel,
  mapRoleLabel,
  mapServiceTypeLabel,
  mapTrainingStatusLabel,
  normalizeDisplayName,
  taskActions,
} from './formatters.js';

export function showScannerViewfinder(onComplete) {
  let overlay = document.getElementById('scanner-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'scanner-overlay';
    overlay.className = 'scanner-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '现场微晶核验取景器');
    overlay.innerHTML = `
      <div class="scanner-card">
        <div class="scanner-header">
          <span class="scanner-status-dot"></span>
          <span class="scanner-title">现场扫码打卡 · 微晶取景器</span>
        </div>
        <div class="scanner-viewfinder">
          <div class="scanner-reticle">
            <div class="corner-bracket top-left"></div>
            <div class="corner-bracket top-right"></div>
            <div class="corner-bracket bottom-left"></div>
            <div class="corner-bracket bottom-right"></div>
            <div class="scanner-laser-line"></div>
            <div class="scanner-crosshair"></div>
          </div>
        </div>
        <p class="scanner-prompt">请对准长者家中微晶服务二维码</p>
        <p class="scanner-subprompt">📍 现场地理围栏已自动定位校准</p>
        <button id="cancel-scan-btn" class="btn btn-secondary-action scanner-cancel-btn">取消扫码</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  overlay.style.display = 'flex';
  let timer = null;
  const cleanup = () => {
    if (timer) clearTimeout(timer);
    overlay.style.display = 'none';
  };

  const cancelBtn = overlay.querySelector('#cancel-scan-btn');
  if (cancelBtn) cancelBtn.onclick = cleanup;

  timer = setTimeout(() => {
    cleanup();
    if (typeof onComplete === 'function') onComplete();
  }, 650);
}

export function renderLogin() {
  return `
    <div class="full-panel" role="form">
      <div class="login-brand">
        <div class="login-logo-pill">青松安护 PineCare · 志愿先锋</div>
        <h1>志愿者工作台</h1>
        <p class="muted login-subtitle">真实接口联调模式，一站式暖心助老服务</p>
      </div>
      <div class="form-group">
        <label for="api-base" class="field-label">API 服务地址</label>
        <input id="api-base" class="field" value="${escapeHtml(state.apiBase || API_BASE_CANDIDATES[0])}" placeholder="http://127.0.0.1:3999/api/v1" aria-label="API 服务器地址" />
      </div>
      <div class="form-group">
        <label for="phone" class="field-label">志愿者手机号</label>
        <input id="phone" class="field" value="${escapeHtml(state.phone)}" placeholder="请输入手机号 (例如 13710000051)" aria-label="手机号" aria-required="true" ${state.error && state.error.includes('手机号') ? 'aria-invalid="true"' : ''} />
      </div>
      <div class="form-group">
        <label for="code" class="field-label">短信验证码</label>
        <div class="sms-input-row">
          <input id="code" class="field sms-field" value="${escapeHtml(state.code)}" placeholder="输入 6 位验证码" aria-label="验证码" aria-required="true" aria-describedby="code-error" ${state.error && state.error.includes('验证码') ? 'aria-invalid="true"' : ''} />
          <button id="send-sms" class="btn btn-sms" ${state.smsLoading ? 'disabled' : ''} aria-busy="${state.smsLoading}">${state.smsLoading ? '发送中...' : '获取验证码'}</button>
        </div>
      </div>
      <button id="login" class="btn btn-hero-action btn-login" ${state.loginLoading ? 'disabled' : ''} aria-busy="${state.loginLoading}">
        ${state.loginLoading ? '正在核验登录...' : '进入志愿者工作台'}
      </button>
      ${state.error ? `<p id="code-error" class="error" role="alert" aria-live="polite">${escapeHtml(state.error)}</p>` : ''}
      <p class="hint" aria-live="polite">${escapeHtml(state.info)}</p>
    </div>
  `;
}

function renderSummary() {
  const s = state.taskSummary || {};
  return `
    <div class="summary-grid">
      <div class="summary-item"><span class="metric-num">${Number(s.available_count || 0)}</span><small>可接工单</small></div>
      <div class="summary-item"><span class="metric-num">${Number(s.assigned_count || 0)}</span><small>已认领</small></div>
      <div class="summary-item"><span class="metric-num">${Number(s.processing_count || 0)}</span><small>服务中</small></div>
      <div class="summary-item"><span class="metric-num">${Number(s.completed_count || 0)}</span><small>已结案</small></div>
    </div>
  `;
}

function renderTaskFilter() {
  const filters = [
    { key: '', label: '全部工单' },
    { key: 'pending', label: '待认领' },
    { key: 'assigned', label: '已认领' },
    { key: 'processing', label: '服务中' },
    { key: 'completed', label: '已结案' },
  ];
  return `
    <div class="filter-row">
      ${filters.map((item) => `<button class="${state.taskFilter === item.key ? 'chip active' : 'chip'}" data-filter="${item.key}">${item.label}</button>`).join('')}
    </div>
  `;
}

function renderTasks() {
  if (state.loading) return '<p class="muted" aria-live="polite" aria-busy="true">工单数据加载中...</p>';
  if (!state.tasks.length) return '<p class="muted" aria-live="polite">当前分类下暂无可处理的助老工单。</p>';

  return `<div role="list" aria-label="任务列表">${state.tasks.map((task) => {
    const actions = taskActions(task);
    return `
      <article class="task-card ${task.status === 'pending' ? 'pending' : ''} ${task.status === 'processing' ? 'processing' : ''}" role="listitem" aria-label="任务 ${escapeHtml(task.order_no || `#${task.id}`)}: ${escapeHtml(getStatusLabel(task.status))}">
        <div class="task-head">
          <strong>${escapeHtml(task.order_no || `工单 #${task.id}`)}</strong>
          <span class="task-status ${task.status}">${escapeHtml(getStatusLabel(task.status))}</span>
        </div>
        <p class="task-line">服务项目：${escapeHtml(mapServiceTypeLabel(task.service_type))}</p>
        <p class="task-line">服务对象：${escapeHtml(normalizeDisplayName(task.elder_name, '长辈用户'))} (${escapeHtml(task.elder_phone || '-')})</p>
        <p class="task-line">预约时间：${escapeHtml(task.scheduled_at || '-')}</p>
        <p class="task-line">结案时间：${escapeHtml(task.completed_at || '-')}</p>
        ${actions.length
          ? `<div class="task-actions">${actions.map((item) => {
              const pending = state.actionEndpoint === item.endpoint;
              return `<button class="${item.hero ? 'btn btn-hero-action' : 'btn btn-secondary-action'}" data-endpoint="${item.endpoint}" ${item.isScan ? 'data-scan="true"' : ''} ${pending ? 'disabled' : ''} aria-busy="${pending}">${pending ? '正在处理...' : escapeHtml(item.label)}</button>`;
            }).join('')}</div>`
          : '<p class="hint">该工单当前处于正常流转态，暂无需操作。</p>'}
      </article>
    `;
  }).join('')}</div>`;
}

function renderTraining() {
  if (state.loading) return '<p class="muted" aria-live="polite" aria-busy="true">培训赋能记录加载中...</p>';
  if (!state.training.length) return '<p class="muted" aria-live="polite">暂无专项技能培训记录。</p>';

  return state.training.map((item) => `
    <article class="training-card" aria-label="培训课程：${escapeHtml(item.training_title || '志愿赋能专项培训')}">
      <div class="task-head">
        <strong>${escapeHtml(item.training_title || '志愿赋能专项培训')}</strong>
        <span class="task-status processing">${escapeHtml(mapTrainingStatusLabel(item.training_status))}</span>
      </div>
      <p class="task-line">修读时间：${escapeHtml(item.training_at || '-')}</p>
      <p class="task-line">认证有效至：${escapeHtml(item.expires_at || '-')}</p>
      ${item.certificate_url ? `<a class="link" href="${escapeHtml(item.certificate_url)}" target="_blank" rel="noreferrer">查验资格证书</a>` : ''}
    </article>
  `).join('');
}

function renderProfile() {
  const p = state.profile || {};
  return `
    <article class="profile-card" aria-label="个人档案">
      <p class="task-line">志愿者姓名：${escapeHtml(normalizeDisplayName(p.name, '青松志愿者'))}</p>
      <p class="task-line">认证手机号：${escapeHtml(p.phone || '-')}</p>
      <p class="task-line">服务身份：${escapeHtml(mapRoleLabel(p.role))}</p>
      <p class="task-line">所属网格站：${escapeHtml(p.community_id || '-')}</p>
      <p class="task-line">加入时间：${escapeHtml(p.joined_at || '-')}</p>
      <p class="task-line">服务接口节点：${escapeHtml(state.apiBase || '-')}</p>
    </article>
  `;
}

export function renderDashboard() {
  const profileName = normalizeDisplayName(state.profile && state.profile.name, '志愿者');
  return `
    <div class="map-layer" aria-label="辖区社区服务地图">
      <div class="map-grid-overlay"></div>
      <div class="map-station-badge"><span class="station-dot"></span><span>青松安护 · 社区互助网格</span></div>
      <div class="map-top-bar">
        <div class="map-status-pill"><span class="pulse-indicator"></span><span>${state.isOnline ? '网格巡航中' : '离线离网模式'}</span></div>
        <button id="logout" class="btn btn-logout" aria-label="安全退出">安全退出</button>
      </div>
    </div>
    <div class="bottom-sheet ${state.sheetMode}" role="main">
      <div class="drag-handle-wrapper" role="button" tabindex="0" aria-label="调节工作台抽屉高度">
        <div class="drag-handle"></div>
        <div class="drag-handle-indicator">
          <span class="mode-dot ${state.sheetMode === 'collapsed' ? 'active' : ''}"></span>
          <span class="mode-dot ${state.sheetMode === 'default' ? 'active' : ''}"></span>
          <span class="mode-dot ${state.sheetMode === 'expanded' ? 'active' : ''}"></span>
        </div>
      </div>
      <div class="sheet-header">
        <div>
          <h2>${escapeHtml(profileName)}，辛苦了</h2>
          <div class="service-badge"><span>🏅 已累计奉献服务 <strong>${Number(state.serviceHours || 0)}</strong> 小时</span></div>
        </div>
      </div>
      <div class="scroll-area">
        ${renderSummary()}
        <nav aria-label="主菜单导航" role="navigation" class="tabs-container">
          <div class="tabs" role="tablist">
            <button class="tab ${state.currentTab === 'tasks' ? 'active' : ''}" data-tab="tasks" role="tab" aria-selected="${state.currentTab === 'tasks'}" aria-controls="tab-tasks">接单大厅</button>
            <button class="tab ${state.currentTab === 'training' ? 'active' : ''}" data-tab="training" role="tab" aria-selected="${state.currentTab === 'training'}" aria-controls="tab-training">技能培训</button>
            <button class="tab ${state.currentTab === 'profile' ? 'active' : ''}" data-tab="profile" role="tab" aria-selected="${state.currentTab === 'profile'}" aria-controls="tab-profile">我的账户</button>
          </div>
        </nav>
        ${state.currentTab === 'tasks' ? renderTaskFilter() : ''}
        ${state.error ? `<p class="error" role="alert" aria-live="polite">${escapeHtml(state.error)}</p>` : ''}
        <p class="hint" aria-live="polite">${escapeHtml(state.info)}</p>
        <div role="tabpanel" id="tab-tasks" ${state.currentTab === 'tasks' ? '' : 'hidden'}>${state.currentTab === 'tasks' ? renderTasks() : ''}</div>
        <div role="tabpanel" id="tab-training" ${state.currentTab === 'training' ? '' : 'hidden'}>${state.currentTab === 'training' ? renderTraining() : ''}</div>
        <div role="tabpanel" id="tab-profile" ${state.currentTab === 'profile' ? '' : 'hidden'}>${state.currentTab === 'profile' ? renderProfile() : ''}</div>
      </div>
    </div>
  `;
}

let touchStartY = 0;
let touchStartTime = 0;

function updateSheetClass() {
  const sheet = document.querySelector('.bottom-sheet');
  if (sheet) sheet.className = `bottom-sheet ${state.sheetMode}`;
  const dots = document.querySelectorAll('.mode-dot');
  if (dots.length === 3) {
    dots[0].classList.toggle('active', state.sheetMode === 'collapsed');
    dots[1].classList.toggle('active', state.sheetMode === 'default');
    dots[2].classList.toggle('active', state.sheetMode === 'expanded');
  }
}

export function setupDrawerGestures(root) {
  const handleWrapper = root.querySelector('.drag-handle-wrapper');
  if (!handleWrapper) return;

  handleWrapper.addEventListener('click', () => {
    if (Date.now() - touchStartTime < 250) return;
    state.sheetMode = state.sheetMode === 'default' ? 'expanded' : 'default';
    updateSheetClass();
  });

  handleWrapper.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }
  }, { passive: true });

  handleWrapper.addEventListener('touchend', (e) => {
    if (!e.changedTouches || !e.changedTouches[0]) return;
    const diffY = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(diffY) <= 25) return;
    if (diffY < 0) {
      state.sheetMode = state.sheetMode === 'collapsed' ? 'default' : 'expanded';
    } else {
      state.sheetMode = state.sheetMode === 'expanded' ? 'default' : 'collapsed';
    }
    updateSheetClass();
  }, { passive: true });
}
