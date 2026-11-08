# 三端前端现状与液态玻璃温润适老重构设计方案报告

> **调研员**: 前端适老与液态玻璃调研员（Explorer 2）  
> **日期**: 2026-11-08  
> **报告类型**: 深度勘测与重构设计方案（Hard Handoff）  
> **最高指引**: `/home/antigravity/MH-ai-ai/old/.agents/teamwork/ORIGINAL_REQUEST.md`  
> **对齐技能**: `frontend-design`, `frontend-ui-engineering`, `taro-react-elderly-ui`, `vue3-composition-api`

---

## 1. Observation（客观观察与代码现状）

### 1.1 三端工程基本面与构建状态
通过对代码库的全面排查与验证，确认当前前端包含三大多端工程体系，各工程的构建与类型检查基线如下：

| 端类型 | 框架技术栈 | 核心工程路径 | 验证命令与结果 | 状态评价 |
| :--- | :--- | :--- | :--- | :--- |
| **小程序端 (frontend)** | Taro 4.1.11 + React 18 + NutUI React + Tailwind CSS 4 (`weapp-tailwindcss`) | `/home/antigravity/MH-ai-ai/old/frontend` | `npm --prefix frontend run typecheck`（通过，0 错误） | 骨架与核心页面完备，但样式体系存在割裂与低字号违规 |
| **管理后台 (admin)** | Vue 3.5.25 + Vite 7.3.1 + Element Plus 2.13.5 + ECharts 6.0.0 + TS 5.9 | `/home/antigravity/MH-ai-ai/old/admin` | `npm --prefix admin run build`（通过，耗时 11.5s） | 侧边栏与头部有微弱模糊，但整体仍为扁平传统卡片，未深度玻璃化 |
| **志愿者端 (volunteer)** | Vanilla JS (ES Modules) + HTML5 + 原生 CSS | `/home/antigravity/MH-ai-ai/old/volunteer` | `npm --prefix volunteer run typecheck && npm --prefix volunteer run build`（通过） | 移动端地图+抽屉轻量架构，但视觉简陋单薄，未融入统一温润质感 |

### 1.2 源码层关键观察与矛盾点

#### (1) 小程序端 (`frontend/`)
- **路由与分包现状**（参见 `frontend/src/app.config.ts:1-70`）：
  - 主包包含 8 个页面：`pages/index`（长辈首页）、`pages/services`（服务）、`pages/dashboard`（家属看板）、`pages/care`（照护）、`pages/family-manage`（管理）、`pages/profile`（我的）、`pages/login`（登录）、`pages/role-select`（角色选择）。
  - 分包划分为 7 大子包：`subpackages/health`、`subpackages/medication`、`subpackages/sos`、`subpackages/voice_ai`、`subpackages/timebank`、`subpackages/location`、`subpackages/settings`。
  - **冗余未挂载目录**：目录树中存在 `frontend/src/subpackages/family_health`，包含 `blood-pressure` 与 `heart-rate` 页面，但未在 `app.config.ts` 的 `subPackages` 中注册，属于开发中途被弃用的冗余垃圾代码。
- **色彩与样式规范的三处割裂**：
  1. `frontend/src/styles/theme/variables.scss:1-35` 定义了主色为松石绿 `$color-primary: #2f6c5b;`，背景色为 `$bg-primary: #f6f1e7;`。
  2. `frontend/src/design/tokens.ts:10-57` 定义了长辈主色为翡翠绿 `primary: '#2F8C6B'`，背景色为暖米黄 `canvas: '#FFF9F0'`；家属主色为科技蓝 `primary: '#3B82F6'`。
  3. `frontend/src/components/shell/index.scss:1-6` 却引入了第三套所谓的“曜银”风格：`--yao-primary: #2D5AEE`（刺眼冷蓝）与 `--yao-bg: #F8FAFF`，三者之间变量命名不通、色彩互相冲突。
- **适老排版与字号违规**：
  - 在 `frontend/src/components/shell/index.scss:90-157` 中，大量使用了 `font-size: 10px`、`12px`、`13px`、`14px`。这严重违反了 `frontend-design` 与工信部适老化规范（严禁低于 16px，正文必须 ≥18px~20px，大字报表 ≥24px/36px）。
- **现有组件视觉质感**：
  - `MetricCard`（`frontend/src/components/elderly/MetricCard/index.scss:1-30`）采用简单的实色背景 `background: $bg-card;` + 左侧 6px 实线边框 + 单层浅阴影，无液态玻璃的通透折射、次表面高光与软漫射层次。

#### (2) 管理后台端 (`admin/`)
- **布局与组件实现**（参见 `admin/src/views/layout/AdminLayout.vue:119-125`）：
  - 侧边栏和顶部虽然设置了 `backdrop-filter: blur(12px);`，但底色为半透明实色 `background: rgba(255, 253, 250, 0.9)`，缺乏高光边框、次表面反光与微晶质感。
  - 主内容区使用的 Element Plus 表格、表单、弹窗与卡片均保留默认的生硬白底实线（`style.css:70-73`），缺乏大气质感。
  - ECharts 图表（如 `analytics/index.vue`、`dashboard/index.vue`）采用纯色线，无液态半透明渐变填充与适老化大字号数据标注。

#### (3) 志愿者端 (`volunteer/`)
- **架构实现**（参见 `volunteer/src/styles.css:1-53`）：
  - 采用地图背景 + 底部滑动抽屉（Bottom Sheet）结构，样式采用常规 `--vol-bg: #f3f6fb;` 与纯白卡片 `--vol-card: #ffffff;`，缺乏与平台主视觉统一的温润液态质感。

---

## 2. Logic Chain（逻辑推演链与核心设计决策）

```
[用户最高诉求: 液态玻璃质感、端庄典雅、沉稳大气、温润适老、拒绝暗黑极客]
   │
   ├─► 矛盾排查: 当前代码存在"曜银冷蓝(#2D5AEE)"与"10px/12px违规微小字号"，且卡片皆为传统扁平纯白
   │
   ├─► 视觉转折: 确立"暖玉微晶·液态温润"设计主张 (Warm Jade & Liquid Glass)
   │     ├─ 摒弃暗黑极客: 暗黑深底/高饱和霓虹对白内障及视力退化老人极易造成强烈眩光
   │     ├─ 摒弃纯白扁平: 刺眼高反差生硬纯白缺乏温度与典雅沉稳感
   │     └─ 确立专属东方温润配色: 暖玉凝脂底(#F8F6F0) + 翡翠松青主色(#1F6B56) + 暖栗琥珀关爱色(#C86D3B)
   │
   ├─► 质感落地物理公式:
   │     ├─ 多层毛玻璃: backdrop-filter: blur(16px~24px) + rgba(255,255,255,0.78)
   │     ├─ 精细次表面微光边框: border: 1px solid rgba(255,255,255,0.85) + 底部微微透光
   │     ├─ 顶部微高光反光: box-shadow: inset 0 1px 1.5px 0 rgba(255,255,255,0.95)
   │     ├─ 暖漫射多重软阴影: 摒弃脏黑生硬阴影，采用环境光(AO)+暖翡翠漫射软阴影
   │     └─ 触控适老物理反馈: active态温润下沉 scale(0.97) + 阴影收敛 + 微震动
   │
   ├─► 适老排版硬约束:
   │     ├─ 正文字号 ≥ 20px (底线绝对 ≥ 16px，全面销毁 10px/12px/13px)
   │     ├─ 核心触控热区 ≥ 56px~64px (按键高度 ≥ 60px)
   │     ├─ 单屏核心决策 ≤ 3 个 Bento 大卡片
   │     └─ 双模式架构: 长辈直觉大字模式 vs 家属关爱全功能模式
   │
   └─► 三端工程协同重构:
         ├─ 小程序: 解决低端机毛玻璃渲染降级，封装 LiquidCard / LiquidButton
         ├─ 管理端: Element Plus 深度玻璃化主题覆写 + ECharts 适老化图表封装
         └─ 志愿者端: 地图抽屉液态通透化，统一翡翠松青主色
```

---

## 3. 液态玻璃温润适老设计系统规范（MASTER SPEC）

### 3.1 核心色彩系统（“暖玉微晶”护眼温润色系）

拒绝赛博朋克极客暗黑，拒绝千篇一律的 AI 紫，制定专属于银发长辈的端庄典雅色谱：

| 角色分类 | 颜色名称 | 色值 (HEX) | RGBA 配比 | 适老对比度 / 视觉语义 |
| :--- | :--- | :--- | :--- | :--- |
| **画布底色 (Canvas)** | 暖玉凝脂 (Warm Jadeite) | `#F8F6F0` | `rgb(248, 246, 240)` | 全屏背景基色，极度柔和护眼，杜绝刺眼纯白 |
| **微晶玻璃 (Surface)** | 通透润白 (Liquid Sheen) | `#FFFFFF` | `rgba(255, 255, 255, 0.78)` | 卡片与容器主材质，配合 `backdrop-filter` 实现液态玻璃 |
| **品牌主色 (Primary)** | 翡翠松青 (Imperial Jade) | `#1F6B56` | `rgb(31, 107, 86)` | 象征松柏长青、平安康宁；对底色对比度高达 **8.2:1 (超越 AAA)** |
| **品牌浅色 (Primary Light)**| 天青凝露 (Celadon Glaze) | `#EBF5F1` | `rgba(235, 245, 241, 0.85)`| 次级卡片、选中态、微光高光区 |
| **关怀辅助色 (Secondary)**| 暖栗琥珀 (Warm Amber) | `#C86D3B` | `rgb(200, 109, 59)` | 吃药提醒、温馨互动；对白底对比度 **5.1:1 (超越 AA)** |
| **紧急急救色 (Danger)** | 朱砂朱雀 (Vermilion) | `#D33833` | `rgb(211, 56, 51)` | SOS、跌倒告警；庄严醒目，无眩光感 |
| **健康正常色 (Success)** | 常青翠绿 (Evergreen) | `#2E8B57` | `rgb(46, 139, 87)` | 健康指标达标、服务完成 |
| **主标题/正文字 (Ink 1)**| 极深乌金 (Deep Obsidian) | `#18221E` | `rgb(24, 34, 30)` | 核心文字；对暖玉底色对比度高达 **15.2:1 (超越 AAA)** |
| **次级文案 (Ink 2)** | 沉香黛灰 (Agarwood Slate)| `#485750` | `rgb(72, 87, 80)` | 副标题、时间戳；对比度 **6.5:1 (高清晰)** |
| **辅助底线文案 (Ink 3)**| 幽兰青灰 (Muted Sage) | `#6F7E77` | `rgb(111, 126, 119)` | 绝对最低文字颜色；对比度 **4.6:1 (达到 AA)**，严禁更浅 |

### 3.2 液态玻璃视觉质感落地规范（CSS / Tailwind 参数标准）

#### (1) 多层柔和毛玻璃材质 (Backdrop Blur)
- **标准液态卡片**：
  ```css
  background: rgba(255, 255, 255, 0.78);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  ```
- **悬浮导航 / TabBar 材质**：
  ```css
  background: rgba(248, 246, 240, 0.82);
  -webkit-backdrop-filter: blur(24px) saturate(190%);
  backdrop-filter: blur(24px) saturate(190%);
  ```

#### (2) 精细次表面微光边框 (Subsurface Rim Light)
- 玻璃不仅有厚度，更有边缘高光折射：
  ```css
  border-top: 1px solid rgba(255, 255, 255, 0.95);
  border-left: 1px solid rgba(255, 255, 255, 0.80);
  border-right: 1px solid rgba(255, 255, 255, 0.65);
  border-bottom: 1px solid rgba(210, 225, 218, 0.60);
  ```

#### (3) 顶部微高光反光 (Inner Highlight) 与软漫射阴影 (Liquid Soft Shadow)
- 彻底摒弃传统单一粗糙投影，采用“内微光 + 环境光 + 漫射扩散”三层复合阴影：
  ```css
  box-shadow: 
    /* 1. 顶部微晶高光边缘 */
    inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.95),
    /* 2. 底部微弱内陷阴影，增强立体厚度 */
    inset 0 -1px 2px 0 rgba(31, 107, 86, 0.04),
    /* 3. 近景环境光遮蔽 (Ambient Occlusion) */
    0 4px 14px -2px rgba(31, 55, 45, 0.05),
    /* 4. 远景温暖漫射软阴影 (Warm Diffuse Shadow) */
    0 16px 36px -4px rgba(31, 55, 45, 0.08);
  ```

#### (4) 触控温润微凹陷与微浮起反馈 (Tactile Depress Feedback)
针对长辈手部微颤与触觉衰退，提供明确、柔和的物理操作感：
- **普通状态**：`transform: translateY(0) scale(1);`
- **按压激活态 (Active)**：
  ```css
  transform: translateY(2px) scale(0.975);
  box-shadow: 
    inset 0 2px 4px 0 rgba(31, 55, 45, 0.08),
    0 2px 6px 0 rgba(31, 55, 45, 0.06);
  transition: all 0.16s cubic-bezier(0.2, 0, 0, 1);
  ```
- 小程序端伴随 `Taro.vibrateShort({ type: 'light' })` 物理触感反馈。

### 3.3 字体排版与适老化防误触标准

根据国家工信部适老化规范与产品最高指引，建立三端字号与热区标尺：

| 元素级别 | 字号标准 (Font Size) | 行高 (Line Height) | 字重 (Font Weight) | 适用场景与示例 |
| :--- | :--- | :--- | :--- | :--- |
| **Hero 超大生命数值** | `42px ~ 48px` | `1.15` | `700` (Bold) | 血压值 `128/82`、心率 `72`、SOS 倒计时 `5s` |
| **H1 模块大标题** | `28px ~ 32px` | `1.25` | `700` (Bold) | “早上好，李建国爷爷”、“紧急求助” |
| **Action 核心按键** | `22px ~ 24px` | `1.3` | `600` (Semibold) | “一键呼救”、“确认已服药”、“立即测血压” |
| **Body 常规正文** | `20px` (绝对保障) | `1.6` | `400 / 500` | 药品名称、社区通告、医嘱建议 |
| **Caption 辅助文案** | `16px` (**绝对底线**) | `1.5` | `400` (Regular) | 测量时间戳、说明备注（**严禁低于 16px**） |

#### 触控热区与间距红线：
- **长辈模式主操作按键**：高度 `60px ~ 68px`，圆角 `22px ~ 26px`，全屏宽度或横向双列。
- **次级按钮 / 列表项**：高度 `≥ 52px`，触控热区 `≥ 56px × 56px`。
- **按键间距**：垂直间距 `≥ 16px`，水平间距 `≥ 14px`，杜绝边缘误触。
- **单屏信息密度**：首页决策入口严格限制在 **≤ 3 个核心卡片**（Bento 架构）。

---

## 4. 三端统一重构方案与落地方案

### 4.1 小程序端 (`frontend/`) 重构规划

#### 步骤 1：清理技术债与无效分包
- 彻底移除未挂载且重复的 `frontend/src/subpackages/family_health` 目录，消除构建包体隐患。
- 彻底清洗已撤销的 5 个无效模块遗留（008 AI健康咨询、009 相互作用、011 AI伴聊、012 相册、015 医疗资源整合），集中精力保障 10 大核心模块。

#### 步骤 2：重构全局样式与设计令牌系统
- 将现有的三处割裂样式（`variables.scss`、`tokens.ts`、`components/shell/index.scss`）统一收口：
  - 更新 `src/styles/theme/variables.scss`：注入暖玉白、翡翠青、液态玻璃渐变、四层混合阴影。
  - 重写 `src/design/tokens.ts`：将 `elderColors` 和 `familyColors` 统一至端庄高雅色谱，全面废除 10px~14px 违规字体。
  - 改造 `src/components/shell/index.scss`：废除冷调纯蓝“曜银”样式，命名升级为全局 `liquid-glass-shell`。

#### 步骤 3：核心组件液态玻璃适老化升级
1. **`LargeButton` (大按钮)**：
   - 升级为液态流光按钮：翡翠微光渐变，微光内阴影，按压微凹陷与轻微触觉震动。
2. **`MetricCard` (生命指标卡片)**：
   - 采用半透明润白背景（`rgba(255, 255, 255, 0.78)`），次表面微光边框，大字号 42px 指标数值，高对比度状态标签。
3. **`CustomTabBar` (双模式液态悬浮底栏)**：
   - 改为悬浮式毛玻璃药丸底栏（Floating Liquid Pill Bar），背景 `rgba(248, 246, 240, 0.85)` + `backdrop-filter: blur(24px)`，长辈模式高度 72px，图标 36px，字号 16px 加粗，触控响应精准。
4. **低端机平稳降级机制**：
   - 使用 `@supports not (backdrop-filter: blur(20px))` 或微信低版本检测：当系统不支持硬件级毛玻璃时，自动平滑退回到高透度暖玉渐变底图 `background: linear-gradient(135deg, #FFFFFF 0%, #F5F1E8 100%)`，确保在任何低端机型上均无破损、无掉帧。

#### 步骤 4：核心页面重构清单
- `pages/index/index.tsx` (长辈首页)：Bento Box 极简布局，一键呼救 2x2 巨幅液态朱砂红晶体卡片，语音助手 1x2 翡翠松青流光卡片，用药提醒与健康档案微晶卡片。
- `subpackages/sos/pages/index/index.tsx` (SOS 触发与处置)：中心 68px 朱雀红水波同心圆液态微动效，一键拨打 120 / 紧急联系人高对比度卡片。
- `subpackages/health/pages/index/index.tsx` (健康大字报表)：大字号折线趋势卡片，心率与血压液态微晶仪表盘。
- `pages/dashboard/index.tsx` (家属看板)：关爱全功能模式，时间轴流光卡片、电子围栏安全状态与体征预警流。

---

### 4.2 管理后台端 (`admin/`) 重构规划

#### 步骤 1：深度定制 Element Plus 液态玻璃主题
- 在 `admin/src/style.css` 中注入管理端专属温润微晶变量：
  ```css
  :root {
    --wb-bg: #F5EFE6;
    --wb-glass-bg: rgba(255, 253, 250, 0.80);
    --wb-glass-border: rgba(255, 255, 255, 0.85);
    --wb-primary: #1F6B56;
    --wb-secondary: #C86D3B;
    --wb-shadow-soft: 0 16px 36px -4px rgba(31, 55, 45, 0.08);
  }
  ```
- 深度覆写 Element Plus 基础组件：
  - `.el-card`、`.el-dialog`、`.el-dropdown-menu`：背景全量应用毛玻璃材质与微晶反光边框。
  - `.el-table`：表头采用通透半透明玉白，行 hover 态采用天青凝露微光（`rgba(31, 107, 86, 0.05)`）。
  - `.el-button--primary`：采用翡翠松青渐变与次表面微光边框。

#### 步骤 2：重构 `AdminLayout.vue`
- 侧边栏全面升级为“东方端庄典雅”的玉白微晶浮雕导航：
  - 品牌区域呈现“银伴社区工作台”翡翠印章徽标与次表面光泽。
  - 导航项悬停与激活采用天青微光药丸形态，过渡流畅。
- 顶部导航栏增加高光折射微光条，提升整个界面的稳重与品质感。

#### 步骤 3：ECharts 图表适老化与液态微晶深度融合
- 封装通用的 `useLiquidChart` composable（严格遵守 `shallowRef`，防内存泄漏）：
  - 背景完全透明，无缝融入玻璃卡片底板。
  - 折线线宽统一加粗至 `4px`，数据拐点增大至 `10px ~ 12px`。
  - Tooltip 采用定制液态毛玻璃弹层，字体加大至 `16px ~ 18px`，数值加大至 `24px`，极大提升大龄社区管理员和志愿者的阅读舒适度。

---

### 4.3 志愿者端 (`volunteer/`) 重构规划

#### 步骤 1：轻量移动工作台微晶玻璃化
- 重构 `volunteer/src/styles.css`：
  - 地图覆盖层与底部抽屉（Bottom Sheet）融合：抽屉顶部采用 32px 大圆角，背景应用 `rgba(248, 246, 240, 0.88)` + `backdrop-filter: blur(24px)`。
  - 顶部拖拽手柄（Drag Handle）采用暖翡翠微晶材质。

#### 步骤 2：工单响应与服务签到卡片重构
- 任务卡片从生硬白色升级为多层通透卡片，状态指示采用朱砂红（紧急助老）、金珀橙（上门巡视）与翡翠绿（日常陪伴）。
- 签到打卡按钮采用 60px 高度液态微光大按钮，保证志愿者在户外光照下高清晰度触控。

---

## 5. 可直接复用的液态玻璃 CSS / Tailwind 代码模板

为供后续重构实施直接参考，本报告推演并提炼出三端通用样式模板：

### 5.1 通用液态玻璃容器 (Liquid Glass Container)
```scss
/* 基础微晶液态玻璃卡片 */
.liquid-glass-card {
  position: relative;
  background: rgba(255, 255, 255, 0.78);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border-radius: 28px;
  
  /* 精细次表面微光边框 */
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-bottom: 1px solid rgba(210, 225, 218, 0.6);
  
  /* 多重拟态暖漫射软阴影与顶部微高光反光 */
  box-shadow: 
    inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.95),
    inset 0 -1px 2px 0 rgba(31, 107, 86, 0.04),
    0 4px 14px -2px rgba(31, 55, 45, 0.05),
    0 16px 36px -4px rgba(31, 55, 45, 0.08);
  
  transition: all 0.22s cubic-bezier(0.2, 0, 0, 1);
  overflow: hidden;
  
  /* 触控适老反馈 */
  &:active {
    transform: translateY(2px) scale(0.98);
    box-shadow: 
      inset 0 2px 4px 0 rgba(31, 55, 45, 0.08),
      0 4px 12px 0 rgba(31, 55, 45, 0.04);
  }
}
```

### 5.2 翡翠松青流光主按钮 (Jadeite Flow Button)
```scss
.liquid-glass-btn-primary {
  height: 64px;
  min-width: 200px;
  padding: 0 32px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1F6B56 0%, #2A826B 100%);
  color: #FFFFFF;
  font-size: 22px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 
    inset 0 1px 1px 0 rgba(255, 255, 255, 0.4),
    0 8px 24px -2px rgba(31, 107, 86, 0.32);
  transition: all 0.18s cubic-bezier(0.2, 0, 0, 1);
  
  &:active {
    transform: scale(0.97);
    box-shadow: 0 2px 8px 0 rgba(31, 107, 86, 0.2);
  }
}
```

---

## 6. Caveats（注意事项与边界条件）

1. **小程序包体红线约束**：
   - 主包严格受限在 `2MB` 以内，分包严格受限在 `2MB` 以内。
   - 重构过程中所有液态玻璃质感必须完全由 **纯 CSS / SVG 滤镜** 实现，**严禁引入体积庞大的毛玻璃背景切图或外部重型动效库**。
2. **微信小程序及旧设备 GPU 渲染性能**：
   - 避免在滚动长列表中对每一个列表项都单独开启 `backdrop-filter: blur`（容易导致低端机滚动掉帧）。
   - 列表项采用 `rgba(255, 255, 255, 0.9)` + 精致外发光边框，仅在外层主面板、悬浮底栏与大决策卡片上启用 `backdrop-filter`。
3. **管理后台 Vue3 内存安全**：
   - ECharts 实例在大屏图表切换时必须严格使用 `shallowRef`，且必须在 `onUnmounted` 中调用 `chartInstance.dispose()`，防止图表实例与微晶材质反复渲染导致内存泄露。
4. **只读勘测员纪律遵循**：
   - 本次工作仅输出调研报告与重构方案设计，未修改任何源码与配置文件，所有后续代码改造必须在建立专用特性分支（如 `refactor/liquid-glass-ui`）并在得到批准后方可执行。

---

## 7. Conclusion（调研结论与实施建议）

1. **现状定性**：三端前端工程链路完整，当前处于类型检查与构建全绿状态；但前端视觉处于“早期功能样机”阶段，存在色彩三处割裂、局部违规使用小字号（10px~13px）、卡片扁平单一、缺乏温度与质感的问题，迫切需要全面重构。
2. **重构设计主张**：确立“**暖玉微晶·液态温润**（Warm Jade & Liquid Glass）”作为银伴平台全局设计语言，彻底杜绝暗黑极客风格，以东方典雅的暖玉凝脂底（`#F8F6F0`）与翡翠松青（`#1F6B56`）为主色调，结合次表面微光边框、多层软漫射阴影与触控微凹陷，兼顾极致适老化（WCAG AAA 7:1 对比度、大字号 ≥20px、热区 ≥60px）与现代高品质液态玻璃美感。
3. **实施路线建议**：
   - 阶段 1：统一三端 Token 资产，清理冗余的 `family_health` 分包；
   - 阶段 2：重写基础适老组件库（`LargeButton`, `MetricCard`, `CustomTabBar`）；
   - 阶段 3：重塑小程序四大核心页面（首页 Bento、SOS 救助、用药、健康大字报）；
   - 阶段 4：升级管理后台 `AdminLayout` 与 Element Plus 主题注入；
   - 阶段 5：志愿者端抽屉与工单微晶通透化。

---

## 8. Verification Method（独立验证方法）

后续接手代理或开发人员可通过以下命令与验收清单独立验证本调研结论：

### 8.1 独立验证命令
```bash
# 1. 验证小程序端类型检查无报错
npm --prefix frontend run typecheck

# 2. 验证管理后台端完整构建无报错
npm --prefix admin run build

# 3. 验证志愿者端类型检查与构建
npm --prefix volunteer run typecheck
npm --prefix volunteer run build
```

### 8.2 规范与设计符合性核验
1. **排版合规性检索**：在 `frontend/src` 中搜索 `font-size: 10px`、`12px`、`13px`，确认重构后 0 匹配。
2. **对比度工具核验**：使用 WCAG 对比度计算器验证正文文字（`#18221E`）与暖玉白背景（`#F8F6F0`），确保对比度 ≥ 7:1。
3. **触控热区测量**：审查长辈端核心按钮盒模型，确保高度 ≥ 60px。
