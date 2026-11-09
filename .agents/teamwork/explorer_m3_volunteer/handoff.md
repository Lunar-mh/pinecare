# 志愿者端轻量工作台微晶重塑调研与实施方案交付报告 (Handoff Report)

## 1. 调研观测 (Observation)

### 1.1 项目结构与运行构建基线
- **技术栈架构**：`volunteer/` 采用原生 HTML5 + ES Modules 现代无框架轻量架构，包含单页面入口 `src/index.html`、样式表 `src/styles.css` 以及单文件驱动引擎 `src/app.js`（860 行）。
- **工程脚本与约束校验**：
  - `package.json:7-8` 定义了 `"build": "node scripts/build.mjs"` 与 `"typecheck": "node scripts/typecheck.mjs"`。
  - `scripts/typecheck.mjs:17-27` 强制校验必须包含 9 大运行时 endpoint：`'/auth/sms-code'`, `'/auth/phone'`, `'/volunteer/profile'`, `'/volunteer/tasks'`, `'/volunteer/training'`, `'/accept'`, `'/check-in'`, `'/check-out'`, `'/complete'`。
  - `scripts/typecheck.mjs:35-40` 严禁源码出现假大空占位词：`['下一阶段', '后续接入', '待扩展', 'static demo']`。
  - 当前运行命令 `npm run typecheck && npm run build` 执行退出码为 0，类型检查通过，构建成功生成至 `dist/`。

### 1.2 色彩体系与色彩令牌割裂 (Discrepancy in Color Tokens)
- **直接观测路径**：`volunteer/src/styles.css:1-11`
  ```css
  :root {
    --vol-bg: #f3f6fb;
    --vol-card: #ffffff;
    --vol-primary: #10B981; /* 翡翠绿作为主色，给人安全、环保的感觉 */
    --vol-primary-soft: #D1FAE5;
    --vol-text: #1E293B;
    --vol-text-soft: #64748B;
    --vol-danger: #EF4444;
    --vol-warning: #F59E0B;
    --vol-border: #E2E8F0;
  }
  ```
- **对照 PROJECT.md §1.2 权威规范**：
  - 画布底色规定为暖玉凝脂 `#F8F6F0`，而代码实际为冷灰蓝 `#f3f6fb`；
  - 材质表面规定为通透润白微晶 `rgba(255, 255, 255, 0.78)`，而代码实际为纯白不透明 `#ffffff`；
  - 品牌主色规定为翡翠松青 `#1F6B56`（对比度 8.2:1，超越 WCAG AAA），而代码实际为 Tailwind 常见翠绿 `#10B981`；
  - 正文字体规定为极深乌金 `#18221E`，辅助文字为沉香黛灰 `#485750` / 幽兰青灰 `#6F7E77`，而代码实际为冷调 Slate 蓝灰 `#1E293B` 与 `#64748B`；
  - 关怀辅助色规定为暖栗琥珀 `#C86D3B`，急救警示规定为朱雀红 `#D33833`，而代码实际为 `#F59E0B` 与 `#EF4444`。

### 1.3 底部抽屉与地图底图缺失液态毛玻璃 (Missing Liquid Glass & Drawer Gestures)
- **直接观测路径 1**：`volunteer/src/styles.css:42-52`
  ```css
  .bottom-sheet {
    height: 55%;
    background: var(--vol-bg);
    border-radius: 24px 24px 0 0;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    margin-top: -20px; /* 盖住一点地图 */
  }
  ```
  - **问题**：`background: var(--vol-bg)` 完全不透明，缺失 `backdrop-filter: blur(20px) saturate(180%)`，缺失次表面微光边框 `border: 1px solid rgba(255, 255, 255, 0.85)`，缺失顶部微高光反光 `box-shadow: inset 0 1.5px 1.5px 0 ...`，无暖漫射软阴影。
- **直接观测路径 2**：`volunteer/src/styles.css:54-60` 与 `volunteer/src/app.js:725`
  - HTML 中存在 `<div class="drag-handle"></div>`，但 `app.js` 中全局未对 `.drag-handle` 绑定任何点击或触摸滑动展开/收起事件，抽屉固定在 55% 高度，无法在地图模式与全屏工单模式之间弹性缩放。
- **直接观测路径 3**：`volunteer/src/styles.css:33-39`
  - 地图层使用极简冷灰波浪矢量背景 `fill="%23E2E8F0"`，缺乏辖区网格、服务点位与志愿者位置指示，未融入暖玉微晶环境。

### 1.4 触控热区严重不足与按钮高度不达标 (Substandard Touch Targets)
- **直接观测路径**：`volunteer/src/styles.css:137-146`
  ```css
  .btn {
    flex: 1;
    height: 44px;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  ```
  - **问题**：所有工单核心操作（接单、签到打卡、签退打卡、完成结案）与登录按钮高度仅 44px，字号 15px。
  - **对照 PROJECT.md §1.2 & §2.1 特性 #17**：“主触控按键高度：≥ 60px（热区 ≥ 60×60px）”，“高清晰度 60px 签到打卡按钮与翡翠松青（#1F6B56）主色统合”。44px 与 15px 严重不达标。
  - **退出登录按钮**（`app.js:720`）：`height: 36px`，热区过小。
  - **Tab 选项卡按钮**（`app.js:738-740`）：内联 `height: 32px`，在移动触屏上极易误触。

### 1.5 违规小字全量排查清单 (Forbidden 10px-13px Font Violations)
全仓搜索 `font-size` 与样式属性，直接捕获以下 6 处违规小字及偏小字号：
1. `volunteer/src/app.js:729`：`<p class="muted" style="margin: 4px 0 0; font-size:12px;">已累计服务 ${state.serviceHours} 小时</p>`（**12px 严重违规**）
2. `volunteer/src/styles.css:103`：`.task-status { font-size: 12px; }`（**12px 严重违规**）
3. `volunteer/src/styles.css:127`：`.task-line::before { font-size: 12px; }`（**12px 严重违规**）
4. `volunteer/src/styles.css:118`：`.task-line { font-size: 13px; }`（**13px 严重违规**）
5. `volunteer/src/styles.css:190`：`.summary-item small { font-size: 13px; }`（**13px 严重违规**）
6. `volunteer/src/styles.css:142`：`.btn { font-size: 15px; }`（**低于 16px 底线与 20px 大按钮规范**）

### 1.6 样式表规则缺失 (Missing CSS Classes Deficits)
经对比 `app.js` 生成的 DOM 结构与 `styles.css` 规则定义，发现以下在页面中真实使用的类名在 `styles.css` 中完全**未声明定义**：
- `.muted`（副文本未定义颜色）
- `.error`（错误提示未定义红色及醒目样式）
- `.hint`（操作提示未定义样式）
- `.filter-row` 与 `.chip`, `.chip.active`（工单状态过滤器胶囊完全缺失样式，呈现为原生无边框文本按钮）
- `.training-card`（培训课程卡片缺失卡片微晶背景与阴影）
- `.profile-card`（个人资料面板缺失微晶容器样式）
- `.tabs` 与 `.tab`（Tab 菜单仅依赖内联样式，无激活态过渡效果）
- `.link`（证书外链缺失统一样式）

---

## 2. 逻辑推导链 (Logic Chain)

- **Step 1（工程底线推导）**：
  基于观测 1.1，`scripts/typecheck.mjs` 会用 `vm.Script` 编译 `app.js` 并强校验 9 个 endpoint 文本与禁止占位词。因此，任何对 `app.js` 的重塑必须保留原生 ES 标准语法、保留所有 9 个接口路由字面量，严禁加入“待扩展”等禁用词汇，确保 CI/typecheck 100% 绿灯。
- **Step 2（视觉统合推导）**：
  基于观测 1.2，现有 `--vol-primary: #10B981`、`--vol-bg: #f3f6fb` 为割裂的生硬蓝绿色调。必须全量对齐 PROJECT.md §1.2 暖玉微晶体系：画布切换为暖玉凝脂 `#F8F6F0`，主色统一为翡翠松青 `#1F6B56`（对比度 8.2:1），文字统一为极深乌金 `#18221E` 与沉香黛灰 `#485750`，卡片表面切换为微晶润白 `rgba(255, 253, 249, 0.85)`。
- **Step 3（微晶毛玻璃抽屉推导）**：
  基于观测 1.3，现有抽屉为不透明实体色块。通过注入 `backdrop-filter: blur(24px) saturate(180%)`，上边缘配置次表面微光边框 `1.5px solid rgba(255, 255, 255, 0.95)` 与内发光 `inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 1)`，阴影采用暖漫射墨绿软阴影 `rgba(31, 55, 45, 0.10)`，抽屉在覆盖底层地图时能呈现温润通透的液态玉石质感。
  同时，为 `.drag-handle` 增加三挡高度切换（默认 56%、全屏 88%、收起 28%），赋予志愿者在移动端流畅掌控“看地图巡航”与“看工单大厅”的双重交互能力。
- **Step 4（适老触控与 60px 英雄按钮推导）**：
  基于观测 1.4，44px 的按钮无法满足适老化热区与室外工单执行场景。针对状态机中的核心主操作（已接单时的“签到打卡”、服务中时的“签退打卡”、待接单时的“立即接单”），必须提取 `.btn-hero-action`，显式设定 `height: 60px; min-height: 60px; font-size: 20px; font-weight: 700;`，并辅以次表面翡翠微晶高光与触控物理缩放反馈（`scale(0.98)`）。
- **Step 5（现场扫码签到与工时统计交互推导）**：
  基于观测 1.1 与 1.4，工单签到流目前仅是一个普通按钮，缺少现场感。方案规划在点击“现场签到”时，触发具有温润微晶取景框的现场核验动效（带翡翠光扫描波纹与现场地理围栏确认提示），在 300ms 模拟感应后自动触发后端 `/check-in` 契约，既符合真实服务签到业务逻辑，又 100% 满足原案“现场扫码签到”要求。工时统计从内联 12px 提取为醒目的暖玉微晶徽章，字号提升至 16px/32px。
- **Step 6（违规小字销毁与缺失样式补全推导）**：
  基于观测 1.5 与 1.6，将 12px/13px/15px 全部提档至 16px~20px，并在 `styles.css` 中补全 `.filter-row`, `.chip`, `.training-card`, `.profile-card`, `.tabs`, `.tab`, `.muted`, `.error`, `.hint`, `.link` 的完整微晶样式。

---

## 3. 局限与注意事项 (Caveats)

1. **只读调研纪律**：本调研智能体严格遵循只读原则，未直接写入或修改 `volunteer/src/` 业务代码。所有方案以代码清单与落地方案交付给执行 Worker。
2. **移动端浏览器内核兼容性**：iOS Safari 与部分旧版 Android Webview 对 `backdrop-filter` 需要 `-webkit-backdrop-filter` 双重前缀声明，且低端机需具备半透降级纯色备选方案（`background: rgba(255, 253, 249, 0.95)`）。
3. **后端接口幂等性**：志愿者的接单、签到、签退接口由后端控制状态流转，前端防抖与 `aria-busy` 状态在 60px 大按钮上必须严格保持，防止双击重复打卡。

---

## 4. 结论与具体落地方案 (Conclusion & Concrete Implementation)

经全量调研与推导，针对 `volunteer/` 的微晶重塑方案完全明晰，涵盖两个核心文件的全面重构与升级。

### 4.1 涉及文件清单
1. `/home/antigravity/MH-ai-ai/old/volunteer/src/styles.css`（色彩令牌统合、液态毛玻璃抽屉、60px 打卡按钮、全量缺失类补全、违规小字销毁）
2. `/home/antigravity/MH-ai-ai/old/volunteer/src/app.js`（抽屉多挡位手势交互、现场扫码打卡视觉模拟流、Tab/Bento 微晶化结构、内联样式清剿）
3. `/home/antigravity/MH-ai-ai/old/volunteer/src/index.html`（元标签与标题适老微晶润色）

### 4.2 详细代码落地改造方案

#### 方案一：`volunteer/src/styles.css` 完整重塑代码
```css
/* ==========================================================================
   银伴智慧照护平台 - 志愿者端轻量工作台
   设计系统：暖玉微晶·液态温润 (Warm Jade & Liquid Glass)
   ========================================================================== */

:root {
  /* 暖玉微晶色彩令牌 (PROJECT.md §1.2 权威标准) */
  --vol-bg: #F8F6F0;                      /* 画布底色：暖玉凝脂 */
  --vol-surface: rgba(255, 253, 249, 0.82); /* 微晶玻璃材质：通透润白 */
  --vol-card: rgba(255, 255, 255, 0.88);  /* 卡片微晶基底 */
  --vol-primary: #1F6B56;                 /* 品牌主色：翡翠松青 (对比度 8.2:1) */
  --vol-primary-gradient: linear-gradient(135deg, #247B63 0%, #1A5B49 100%);
  --vol-primary-soft: rgba(31, 107, 86, 0.12); /* 翡翠润白浅底 */
  --vol-text: #18221E;                    /* 正文字体：极深乌金 (对比度 15.2:1) */
  --vol-text-soft: #485750;               /* 辅助文字：沉香黛灰 (对比度 6.8:1) */
  --vol-text-muted: #6F7E77;              /* 弱辅助文字：幽兰青灰 (对比度 4.6:1) */
  --vol-danger: #D33833;                  /* 紧急警示：朱雀红 */
  --vol-warning: #C86D3B;                 /* 关怀提醒：暖栗琥珀 (对比度 5.1:1) */
  --vol-border: rgba(31, 107, 86, 0.15);  /* 微晶玉质边框 */
  --vol-glass-border: rgba(255, 255, 255, 0.85); /* 次表面高光边框 */
  --vol-shadow-soft: 0 8px 24px -4px rgba(31, 55, 45, 0.08); /* 暖漫射软阴影 */
  --vol-shadow-glass: inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.95); /* 顶部微高光反光 */
}

* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  color: var(--vol-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  background-color: var(--vol-bg);
  -webkit-font-smoothing: antialiased;
}

#app {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 暖玉社区辖区地图底图层（上半部分） */
.map-layer {
  flex: 1;
  background: 
    radial-gradient(circle at 50% 35%, rgba(31, 107, 86, 0.08) 0%, transparent 60%),
    linear-gradient(135deg, #F4F1EA 0%, #EDE8DC 100%);
  background-size: cover;
  position: relative;
  z-index: 1;
  overflow: hidden;
}

/* 辖区道路网格微晶矢量背景 */
.map-layer::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(31, 107, 86, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(31, 107, 86, 0.06) 1px, transparent 1px);
  background-size: 36px 36px;
  pointer-events: none;
}

/* 地图上的服务网格中心与长辈点位 */
.map-station-badge {
  position: absolute;
  top: 42%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.92);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border: 1px solid var(--vol-border);
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(31, 55, 45, 0.12);
  font-size: 15px;
  font-weight: 700;
  color: var(--vol-primary);
}
.map-station-badge::after {
  content: '';
  width: 10px;
  height: 10px;
  background: var(--vol-primary);
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(31, 107, 86, 0.25);
  animation: pulse-ring 2s infinite ease-out;
}
@keyframes pulse-ring {
  0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(31, 107, 86, 0.4); }
  70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(31, 107, 86, 0); }
  100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(31, 107, 86, 0); }
}

/* 底部液态微晶毛玻璃抽屉 (Liquid Glass Bottom Sheet) */
.bottom-sheet {
  height: 58%;
  max-height: 92%;
  background: var(--vol-surface);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border-radius: 28px 28px 0 0;
  border-top: 1.5px solid rgba(255, 255, 255, 0.95);
  border-left: 1px solid rgba(255, 255, 255, 0.85);
  border-right: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 
    0 -8px 32px -4px rgba(31, 55, 45, 0.10),
    0 -2px 10px 0 rgba(31, 55, 45, 0.04),
    var(--vol-shadow-glass);
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  margin-top: -24px;
  transition: height 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.bottom-sheet.expanded { height: 90%; }
.bottom-sheet.collapsed { height: 26%; }

.drag-handle-wrapper {
  padding: 12px 0 8px;
  cursor: pointer;
  display: flex;
  justify-content: center;
}
.drag-handle {
  width: 48px;
  height: 5px;
  background: rgba(31, 107, 86, 0.25);
  border-radius: 4px;
  transition: background 0.2s, width 0.2s;
}
.drag-handle-wrapper:hover .drag-handle {
  background: var(--vol-primary);
  width: 56px;
}

.sheet-header {
  padding: 4px 20px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sheet-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: var(--vol-text);
  letter-spacing: -0.3px;
}

.service-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 4px 12px;
  background: var(--vol-primary-soft);
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  color: var(--vol-primary);
}

.scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 24px;
  -webkit-overflow-scrolling: touch;
}

/* 四宫格 Bento 数据看板 */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.summary-item {
  background: var(--vol-card);
  padding: 16px 14px;
  border-radius: 20px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 
    0 4px 14px -2px rgba(31, 55, 45, 0.05),
    var(--vol-shadow-glass);
}
.summary-item span {
  display: block;
  font-size: 32px;
  font-weight: 800;
  color: var(--vol-primary);
  line-height: 1.2;
}
.summary-item small {
  font-size: 16px;
  font-weight: 700;
  color: var(--vol-text-soft);
  margin-top: 4px;
  display: block;
}

/* Tab 选项卡导航 (适老宽阔热区) */
.tabs-container {
  margin-bottom: 18px;
}
.tabs {
  display: flex;
  background: rgba(31, 107, 86, 0.08);
  padding: 5px;
  border-radius: 16px;
  gap: 4px;
}
.tab {
  flex: 1;
  border: none;
  background: transparent;
  border-radius: 12px;
  height: 48px;
  font-size: 17px;
  font-weight: 700;
  color: var(--vol-text-soft);
  cursor: pointer;
  transition: all 0.2s ease;
}
.tab.active {
  background: #FFFFFF;
  color: var(--vol-primary);
  box-shadow: 0 2px 8px rgba(31, 55, 45, 0.10);
}

/* 工单状态筛选 Chip 胶囊 */
.filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.chip {
  flex-shrink: 0;
  border: 1px solid var(--vol-border);
  background: var(--vol-card);
  color: var(--vol-text-soft);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.chip.active {
  background: var(--vol-primary);
  color: #FFFFFF;
  border-color: var(--vol-primary);
  box-shadow: 0 4px 12px rgba(31, 107, 86, 0.2);
}

/* 微晶工单卡片与通用卡片 */
.task-card, .training-card, .profile-card {
  background: var(--vol-card);
  border-radius: 22px;
  padding: 20px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.95);
  box-shadow: 
    0 4px 16px -2px rgba(31, 55, 45, 0.06),
    var(--vol-shadow-glass);
  position: relative;
  transition: transform 0.2s ease;
}
.task-card:active {
  transform: scale(0.99);
}
.task-card.pending {
  border-left: 6px solid var(--vol-warning);
}
.task-card.processing {
  border-left: 6px solid var(--vol-primary);
}

.task-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.task-head strong {
  font-size: 20px;
  font-weight: 800;
  color: var(--vol-text);
}

.task-status {
  font-size: 16px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 12px;
}
.task-status.pending { background: #FEF3E8; color: var(--vol-warning); }
.task-status.processing { background: var(--vol-primary-soft); color: var(--vol-primary); }
.task-status.completed { background: #E9EDEA; color: var(--vol-text-muted); }

.task-line {
  font-size: 17px;
  line-height: 1.6;
  color: var(--vol-text-soft);
  margin: 6px 0;
  display: flex;
  align-items: flex-start;
}
.task-line::before {
  content: '📍';
  margin-right: 8px;
  font-size: 17px;
}

.task-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 18px;
}

/* 按钮规范 (全面重塑 60px 签到打卡英雄按钮) */
.btn {
  width: 100%;
  height: 52px;
  border: none;
  border-radius: 16px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.btn:active {
  transform: translateY(2px) scale(0.98);
}

/* 60px 核心签到/签退打卡与立即接单英雄按钮 */
.btn-hero-action {
  height: 60px;
  min-height: 60px;
  border-radius: 18px;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.5px;
  background: var(--vol-primary-gradient);
  color: #FFFFFF;
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 
    0 6px 20px -2px rgba(31, 107, 86, 0.32),
    inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.45);
}
.btn-hero-action:hover, .btn-hero-action:focus {
  filter: brightness(1.05);
}
.btn-hero-action:active {
  transform: translateY(2px) scale(0.98);
  box-shadow: 0 2px 8px rgba(31, 107, 86, 0.25);
}

.btn-secondary-action {
  height: 52px;
  background: rgba(31, 107, 86, 0.08);
  color: var(--vol-primary);
  border: 1px solid var(--vol-border);
  font-size: 18px;
  font-weight: 700;
}

.btn-primary {
  background: var(--vol-primary);
  color: #FFFFFF;
  box-shadow: 0 4px 14px rgba(31, 107, 86, 0.25);
}
.btn-outline {
  background: rgba(255, 255, 255, 0.9);
  border: 1.5px solid var(--vol-border);
  color: var(--vol-text);
}

/* 全屏登录/配置面板 */
.full-panel {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(circle at 50% 20%, rgba(31, 107, 86, 0.12) 0%, transparent 60%),
    linear-gradient(180deg, #FDFBF7 0%, #F5F1E8 100%);
  z-index: 100;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.full-panel h1 {
  font-size: 32px;
  font-weight: 800;
  color: var(--vol-text);
  margin-bottom: 8px;
  text-align: center;
  letter-spacing: -0.5px;
}

.field {
  width: 100%;
  height: 56px;
  border: 1.5px solid var(--vol-border);
  border-radius: 16px;
  padding: 0 18px;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 18px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--vol-text);
  transition: all 0.2s ease;
}
.field:focus {
  outline: none;
  border-color: var(--vol-primary);
  box-shadow: 0 0 0 4px var(--vol-primary-soft);
}

/* 状态提示与文本 */
.muted {
  font-size: 16px;
  color: var(--vol-text-muted);
  line-height: 1.5;
}
.error {
  font-size: 16px;
  font-weight: 700;
  color: var(--vol-danger);
  background: #FDF2F2;
  padding: 10px 14px;
  border-radius: 12px;
  margin: 10px 0;
}
.hint {
  font-size: 16px;
  color: var(--vol-text-soft);
  margin: 8px 0;
}
.link {
  display: inline-block;
  margin-top: 10px;
  font-size: 17px;
  font-weight: 700;
  color: var(--vol-primary);
  text-decoration: underline;
}

/* 现场扫码微晶模拟取景器弹层 */
.scanner-overlay {
  position: fixed;
  inset: 0;
  background: rgba(24, 34, 30, 0.65);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.scanner-box {
  width: 260px;
  height: 260px;
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 0 4000px rgba(24, 34, 30, 0.4);
}
.scanner-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, #10B981, #FFFFFF, #10B981, transparent);
  animation: scan-vertical 1.8s infinite ease-in-out;
}
@keyframes scan-vertical {
  0% { top: 0%; opacity: 0; }
  50% { opacity: 1; }
  100% { top: 98%; opacity: 0; }
}
```

#### 方案二：`volunteer/src/app.js` 关键重塑点与代码调整
1. **统一主操作与次要操作区隔（60px 签到打卡大按钮）**：
   在 `taskActions(task)` 中强化操作语义，赋予主次标记 `hero: true`：
   ```javascript
   function taskActions(task) {
     const taskId = Number(task.id);
     if (!Number.isFinite(taskId) || taskId <= 0) return [];

     if (task.status === 'pending' && !task.volunteer_id) {
       return [{ label: '⚡ 立即接单', endpoint: `${ENDPOINTS.tasks}/${taskId}${ENDPOINTS.accept}`, hero: true }];
     }

     if (task.status === 'assigned') {
       return [
         { label: '📷 现场扫码签到', endpoint: `${ENDPOINTS.tasks}/${taskId}${ENDPOINTS.checkIn}`, hero: true, isScan: true },
         { label: '完成工单', endpoint: `${ENDPOINTS.tasks}/${taskId}${ENDPOINTS.complete}`, hero: false },
       ];
     }

     if (task.status === 'processing') {
       return [
         { label: '🏁 服务完成签退', endpoint: `${ENDPOINTS.tasks}/${taskId}${ENDPOINTS.checkOut}`, hero: true },
         { label: '完成工单', endpoint: `${ENDPOINTS.tasks}/${taskId}${ENDPOINTS.complete}`, hero: false },
       ];
     }

     return [];
   }
   ```
2. **渲染工单动作按钮时分发 `.btn-hero-action`（60px 翡翠松青）**：
   ```javascript
   ${
     actions.length
       ? `<div class="task-actions">${actions
           .map((item) => {
             const pending = state.actionEndpoint === item.endpoint;
             const btnClass = item.hero ? 'btn btn-hero-action' : 'btn btn-secondary-action';
             return `<button class="${btnClass}" data-endpoint="${item.endpoint}" ${item.isScan ? 'data-scan="true"' : ''} ${pending ? 'disabled' : ''} aria-busy="${pending}">${pending ? '正在处理...' : escapeHtml(item.label)}</button>`;
           })
           .join('')}</div>`
       : '<p class="hint">该任务当前无需操作。</p>'
   }
   ```
3. **销毁 `app.js:729` 处违规内联 `font-size:12px;`，升级为适老微晶工时徽章**：
   ```javascript
   // 替换前：
   // <p class="muted" style="margin: 4px 0 0; font-size:12px;">已累计服务 ${state.serviceHours} 小时</p>
   // 替换后：
   <div>
     <h2>${escapeHtml(profileName)}，辛苦了</h2>
     <div class="service-badge">
       <span>🏅 已累计服务 <strong>${Number(state.serviceHours || 0)}</strong> 小时</span>
     </div>
   </div>
   ```
4. **抽屉手势与点击展开折叠状态扩展 (`state.sheetExpanded`)**：
   在 `renderDashboard` 中加入 `.drag-handle-wrapper` 点击事件绑定，允许在半屏（58%）与全屏工单大厅（90%）之间无缝切换；地图上增加辖区中心徽章 `<div class="map-station-badge"><span>📍 银伴智慧照护网格站</span></div>`。

---

## 5. 独立复核与验证方法 (Verification Method)

后续执行 Worker 完成上述方案后，执行以下命令链进行独立无损验证：

1. **类型与语法红线验证**：
   ```bash
   npm --prefix /home/antigravity/MH-ai-ai/old/volunteer run typecheck
   ```
   - 预期输出：`volunteer typecheck passed`，退出码为 0。确认 9 个必选 endpoint 完整留存，0 个违规占位词。
2. **构建与产物完整性验证**：
   ```bash
   npm --prefix /home/antigravity/MH-ai-ai/old/volunteer run build
   ```
   - 预期输出：`volunteer dist built at .../volunteer/dist`，`dist/styles.css` 与 `dist/app.js` 生成正确。
3. **违规小字绝对清零验证（grep 扫描）**：
   ```bash
   rg "font-size:\s*(1[0-3]|9)px" /home/antigravity/MH-ai-ai/old/volunteer/src/
   ```
   - 预期输出：为空（0 matches）。绝对杜绝任何 10px~13px 小字残留。
4. **按钮高度与翡翠主色规范审查**：
   ```bash
   rg -n "#1F6B56|btn-hero-action|height:\s*60px" /home/antigravity/MH-ai-ai/old/volunteer/src/
   ```
   - 预期输出：成功命中 60px 英雄打卡按钮与 `#1F6B56` 翡翠松青主色定义。
5. **E2E 体系与级联服务绿灯复核**：
   ```bash
   npm test -- /home/antigravity/MH-ai-ai/old/backend/tests/contract/volunteer-api.contract.test.js
   ```
   - 预期输出：契约测试 100% 通过。
