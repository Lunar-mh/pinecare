# Project: 银伴智慧照护平台代码梳理瘦身与液态玻璃温润适老重塑

## 一、项目架构与技术栈全景 (Architecture)

### 1.1 系统架构与边界
```
+---------------------------------------------------------------------------------+
|                                客户端呈现层                                      |
|  +---------------------------+  +----------------------+  +------------------+  |
|  | 小程序端 (frontend)       |  | 管理后台 (admin)     |  | 志愿者端 (vol)   |  |
|  | Taro 4.1 + React 18       |  | Vue 3.5 + Vite 7     |  | 原生 HTML5 + ES6 |  |
|  | 适老Bento + 液态玻璃质感  |  | Element Plus 微晶覆写|  | 轻量微晶移动抽屉 |  |
|  +---------------------------+  +----------------------+  +------------------+  |
+---------------------------------------------------------------------------------+
                                      │ HTTP / RESTful API (双路由挂载 /api/v1 与 /)
+-------------------------------------▼-------------------------------------------+
|                                核心业务后端 (backend)                           |
|  Node.js 18 + Express 4.22 + MySQL 8 + Redis 7 + node-cron 3                   |
|                                                                                 |
|  [统一响应] { code: 200/4xx/500, message: string, data: object }                |
|  [安全与诊断] Livez/Readyz 探针 + 敏感数据脱敏 + 审计流水日志                   |
|  [核心4大刚需主线]:                                                             |
|   1. 居家健康监测 (Health)  - 体征录入、趋势图谱、异常预警、设备统一绑定        |
|   2. SOS 紧急呼救 (SOS)     - 一键求救、跌倒倒计时、时序记账、家属通知调度       |
|   3. 用药提醒 (Medication)  - 计划编排、今日时间轴、服药打卡、分布式任务提醒    |
|   4. 守护互助 (Mutual Aid)  - 家属长辈全景看板、助老工单流转、志愿者打卡签退    |
+---------------------------------------------------------------------------------+
```

### 1.2 核心设计系统：暖玉微晶·液态温润 (Warm Jade & Liquid Glass)
- **视觉定位**：端庄典雅、沉稳大气、温润适老，彻底摒弃暗黑极客风格与生硬纯白。
- **色彩令牌体系**：
  - 画布底色 (Canvas): 暖玉凝脂 `#F8F6F0`
  - 微晶玻璃材质 (Surface): 通透润白 `rgba(255, 255, 255, 0.78)`
  - 品牌主色 (Primary): 翡翠松青 `#1F6B56` (对暖玉底对比度 8.2:1，超越 WCAG AAA)
  - 关怀辅助色 (Secondary): 暖栗琥珀 `#C86D3B` (服药与提醒，对比度 5.1:1，超越 AA)
  - 紧急急救色 (Danger): 朱砂朱雀 `#D33833` (SOS 与跌倒，醒目庄严无眩光)
  - 正文字体 (Ink 1): 极深乌金 `#18221E` (对比度 15.2:1)
  - 辅助文字 (Ink 2/3): 沉香黛灰 `#485750` / 幽兰青灰 `#6F7E77` (底线对比度 ≥4.6:1)
- **液态玻璃物理公式**：
  - 毛玻璃层：`backdrop-filter: blur(20px) saturate(180%)`
  - 次表面微光边框：`border: 1px solid rgba(255, 255, 255, 0.85); border-bottom: 1px solid rgba(210, 225, 218, 0.6)`
  - 顶部微高光反光：`box-shadow: inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.95)`
  - 暖漫射软阴影：`0 4px 14px -2px rgba(31,55,45,0.05), 0 16px 36px -4px rgba(31,55,45,0.08)`
  - 触控物理反馈：`active: transform: translateY(2px) scale(0.975)` + Taro 短震动
- **适老排版硬指标**：
  - 正文字号：≥ 20px（底线绝对 ≥ 16px，严禁 10px~13px）
  - 超大生命指标：42px ~ 48px 加粗
  - 主触控按键高度：≥ 60px（热区 ≥ 60×60px）
  - 单屏决策卡片：≤ 3 个 Bento 卡片

---

## 二、特性清册与裁撤清单 (Feature Inventory & Pruning)

### 2.1 全量特性清册 (Feature Inventory)
| # | 特性名称 | 详细描述 | 归属里程碑 | 权威来源 |
|---|---|---|---|---|
| 1 | 分支隔离与远程建立 | 检出 `refactor/code-cleanup-and-frontend` 分支，推送到远程，防止污染 main | M0 | ORIGINAL_REQUEST §19 |
| 2 | 后端运行时阻断修复 | 修复 `familyService.js:4`、`medicationService.js:3` 失效引用，恢复 `app.js` 启动能力 | M0 | 勘测报告 1 & 3 |
| 3 | 清理历史坏死中间件与控制器 | 删除 `aiConsultController`, `medicalDirectoryController`, `onlineConsultationModel` 等坏死文件 | M0 | 勘测报告 1 |
| 4 | 业务路线精简裁撤 | 彻底物理移除语音助手(`/voice`)、时间银行代币商城(`/time-bank`)、社区活动(`/community/activities`)、统计别名(`/statistics`) | M1 | ORIGINAL_REQUEST §5,21 |
| 5 | 居家健康监测主线加固 | 收拢设备接口至 `/health/devices/*`，提供今日健康、7d/30d趋势、手动录入与硬件同步 | M1 | 勘测报告 1 |
| 6 | SOS紧急呼救全时序加固 | 5秒撤销、跌倒15秒取消、全时序记账流水、紧急联系人队列调度与复盘 | M1 | 勘测报告 1 |
| 7 | 用药提醒慢病管家加固 | 用药计划、今日时间轴、服药打卡热力图、三重分布式定时任务提醒 | M1 | 勘测报告 1 |
| 8 | 守护互助与志愿工单加固 | 家属长辈全景视图、志愿助老工单接单/签到/签退闭环、服务工时沉淀 | M1 | 勘测报告 1 |
| 9 | 后端代码规范与JSDoc补齐 | 严格三层架构事务下沉(`runInTransaction`)、Redis `yinban:` 命名空间、核心~105个方法补齐JSDoc中文注释 | M1 | 8大架构规范 |
| 10| 后端单测套件清理与绿灯 | 清理 46 个失效测试，确保后端 172+ 核心业务测试 100% 绿灯 | M1 | 勘测报告 3 |
| 11| 小程序冗余分包清理 | 彻底移除未注册的 `subpackages/family_health`，消除包体冗余 | M2 | 勘测报告 2 |
| 12| 小程序温润液态玻璃设计系统 | 统合 `variables.scss`、`tokens.ts`、`shell.scss`，消除割裂色系与 10-13px 违规小字 | M2 | ORIGINAL_REQUEST §5,22 |
| 13| 小程序基础适老组件升级 | 重塑 `LiquidGlassCard`, `LargeButton`, `MetricCard`, `CustomTabBar` (液态微晶药丸底栏) | M2 | 勘测报告 2 |
| 14| 小程序核心页面重构 | Bento 首页、SOS紧急呼救、用药日历、健康大字报全量温润玻璃化重构与低端机降级 | M2 | 勘测报告 2 |
| 15| 管理中台 Element Plus 玻璃化 | Element Plus 深度定制微晶玻璃卡片、表头、弹窗，重塑 `AdminLayout` 玉白微晶浮雕导航 | M3 | 勘测报告 2 |
| 16| 管理中台 ECharts 适老化升级 | 适老粗折线、大字弹层、`shallowRef` 内存防泄漏与 `dispose` 清理 | M3 | 勘测报告 2 |
| 17| 志愿者端轻量移动工作台重塑 | 地图底部抽屉液态毛玻璃化，高清晰度 60px 签到打卡按钮与翡翠主色统一 | M3 | 勘测报告 2 |
| 18| 4-Tier 严密 E2E 测试体系 | 涵盖功能核心、边界极值、组合联动与真实长辈场景，发布 `TEST_READY.md` | E2E Track | 勘测报告 3 |
| 19| 全量 E2E 验收与 Tier 5 对抗性强化 | 跑通 100% E2E 测试 (Phase 1)，Challenger 挖掘空隙并加固 (Phase 2) | M4 | Project Pattern |
| 20| 司法完整性审计与 GitHub 同步 | Auditor 一票否决审计，编写重构日志，全量 push 远程分支 | M5 | ORIGINAL_REQUEST §4,19 |

---

## 三、实施里程碑规划 (Milestones)

| # | 里程碑名称 | 核心范围与交付物 | 依赖项 | 负责实体 | 状态 |
|---|---|---|---|---|---|
| **M0** | 分支隔离与工程基线修复 | 检出 `refactor/code-cleanup-and-frontend` 分支并推送远程；修复后端 `familyService.js:4` 与 `medicationService.js:3` 致命启动崩溃；清理孤儿 Controller/Model；修复 package.json 脚本；恢复 `node -e "require('./src/app')"` 启动能力。 | 无 | Worker | PLANNED |
| **Track A** | E2E 测试体系搭建 | 编写 `TEST_INFRA.md`，构建 4-Tier 严密黑盒测试体系（Tier 1 功能、Tier 2 边界、Tier 3 联动、Tier 4 真实长辈场景），发布 `TEST_READY.md`。 | M0 | E2E Testing Orchestrator | PLANNED |
| **M1** | 业务路线裁撤与后端规范化治理 | 彻底物理移除语音助手(`/voice`)、时间银行代币商城(`/time-bank`)、社区活动(`/community/activities`)、统计别名(`/statistics`)；聚焦加固 4 大刚需主线与设备接口；补齐核心 JSDoc 中文注释；统一 Redis `yinban:` 命名空间；实现 `runInTransaction` 事务编排；清理 46 个失效测试套件，保持核心测试 100% 绿灯。 | M0 | Sub-Orchestrator 1 | PLANNED |
| **M2** | 小程序端温润适老“液态玻璃”重构 | 清理 `subpackages/family_health` 残留；统合设计令牌与 SCSS 变量，销毁 10-13px 违规小字；重塑基础适老组件库（`LiquidGlassCard`, `LargeButton`, `MetricCard`, `CustomTabBar`）；重塑 Bento 首页、SOS、用药日历、健康大字报四大核心页面；实施低端机平滑降级；严格控制包体 ≤2MB。 | M0 | Sub-Orchestrator 2 | PLANNED |
| **M3** | 管理后台与志愿者端重构 | Element Plus 深度玻璃化覆写，重塑 `AdminLayout` 玉白微晶浮雕导航；ECharts 适老图表与 `shallowRef` 内存防护；志愿者端地图抽屉通透化与 60px 大按钮。 | M0 | Sub-Orchestrator 3 | PLANNED |
| **M4** | 全量 E2E 验收与对抗性强化 | Phase 1：跑通 100% `TEST_READY.md` E2E 测试；Phase 2：派生 Challenger 执行 Tier 5 对抗性与覆盖率空隙挖掘与加固。 | M1, M2, M3, Track A | Sub-Orchestrator 4 | COMPLETED |
| **M5** | 司法完整性审计与 GitHub 远程同步 | Forensic Auditor 独立审计（一票否决）；编制重构工作日志 `REFACTOR_LOG.md`；代码与日志全量 push 至 GitHub 远程仓库；合并 `main` 并交付。 | M4 | Project Orchestrator | COMPLETED |

---

## 四、接口契约与代码规范 (Interface Contracts & Code Layout)

### 4.1 核心主线接口契约规范
- **统一响应格式**：
  ```json
  {
    "code": 200,
    "message": "success",
    "data": { ... }
  }
  ```
  错误响应：
  ```json
  {
    "code": 400/401/403/404/409/422/500,
    "message": "具体的业务错误提示",
    "data": null
  }
  ```
- **健康监测接口**：
  - `GET /api/v1/health/today` -> `{ code: 200, data: { latestBp, latestHr, alerts: [] } }`
  - `GET /api/v1/health/trend?metricType=blood_pressure&period=7d` -> `{ code: 200, data: { dates: [], values: [] } }`
  - `POST /api/v1/health/manual` (Body: `{ systolic, diastolic, pulse, measuredAt }`) -> `{ code: 200, data: { id, level } }`
  - `GET /api/v1/health/devices` -> `{ code: 200, data: [ { deviceId, deviceName, isPrimary, lastSyncAt } ] }`
- **SOS 应急接口**：
  - `POST /api/v1/sos/trigger` (Body: `{ elderId, latitude, longitude, address, triggerType }`) -> `{ code: 200, data: { eventId, status: "pending", cancelDeadline } }`
  - `POST /api/v1/sos/cancel` (Body: `{ eventId, reason }`) -> `{ code: 200, data: { eventId, status: "canceled" } }`
- **用药提醒接口**：
  - `GET /api/v1/medication/today` -> `{ code: 200, data: [ { planId, medicineName, dosage, scheduledTime, status: "pending"|"taken" } ] }`
  - `POST /api/v1/medication/confirm` (Body: `{ logId, planId, status: "taken" }`) -> `{ code: 200, data: { success: true } }`
- **守护互助接口**：
  - `GET /api/v1/family/elderly-overview?elderId={id}` -> `{ code: 200, data: { elderProfile, healthSummary, medicationProgress, activeSosAlerts } }`
  - `GET /api/v1/volunteer/tasks` -> `{ code: 200, data: [ { taskId, title, elderAddress, serviceType, status } ] }`
  - `POST /api/v1/volunteer/tasks/:id/check-in` -> `{ code: 200, data: { checkInTime } }`

### 4.2 代码结构布局 (Code Layout)
```text
/home/antigravity/MH-ai-ai/old/
├── .agents/
│   ├── skills/                     # 8 大架构与工程规范（权威指导）
│   └── teamwork/                   # 协作元数据目录（计划、进度、简报、各智能体工作区）
├── backend/
│   ├── src/
│   │   ├── config/                 # 数据库、Redis、密钥与全局配置
│   │   ├── controllers/            # 表现层控制器（JSDoc 注释、入参解析、统一 ok/fail）
│   │   ├── services/               # 业务领域服务（单一职责、runInTransaction 事务控制）
│   │   ├── models/                 # 数据模型（唯一操作 MySQL 连接池）
│   │   ├── routes/                 # 路由定义（双路由挂载机制）
│   │   ├── jobs/                   # 分布式定时任务（用药提醒、跟进、余量预警）
│   │   └── utils/                  # 统一响应封装、脱敏工具、事务工具
│   └── tests/                      # 单元测试与集成测试套件
├── frontend/                       # 小程序端 (Taro 4 + React 18)
│   ├── src/
│   │   ├── design/                 # 暖玉微晶设计令牌 tokens.ts
│   │   ├── styles/theme/           # 全局变量 variables.scss
│   │   ├── components/elderly/     # 适老微晶组件 (LiquidGlassCard, LargeButton 等)
│   │   ├── pages/                  # 主包页面 (index, dashboard, profile, login 等)
│   │   └── subpackages/            # 7 大活跃分包 (health, medication, sos, settings 等)
├── admin/                          # 社区管理后台 (Vue 3 + Vite + Element Plus)
│   ├── src/
│   │   ├── views/                  # 视图页面 (大屏、工单、长辈监管、事件复盘)
│   │   ├── components/             # 适老微晶图表与数据看板组件
│   │   └── style.css               # Element Plus 深度液态玻璃主题覆写
└── volunteer/                      # 志愿者轻量工作台 (原生 HTML5 + ES Modules)
    └── src/                        # 移动端微晶抽屉与工单响应
```

---

## 五、死胡同与避坑记录 (Dead Ends Log)
*记录在后续实施过程中被证伪或导致振荡的策略，严禁后续智能体重复尝试。*
| 序号 | 失败方案/策略 | 失败根因 | 替代方向 |
|---|---|---|---|
| 1 | 微信小程序引入大体积毛玻璃图片作为背景 | 严重突破小程序 2MB 主包体积红线，且无法自适应多分辨率 | 采用纯 CSS / Tailwind `backdrop-filter` 配合多层渐变与软阴影实现纯矢量质感 |
| 2 | 后端代理处理语音录音流与唤醒词 | 老人发音不清、方言多导致唤醒失败，且后端 Base64 音频管道高并发 I/O 阻塞严重 | 果断裁撤后端语音代理，前端采用微信小程序原生同声传译与语音播报能力 |
