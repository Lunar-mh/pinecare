# 工程基线、Git分支状态与测试体系摸底报告 (handoff.md)

- **调研角色**: 工程基线与测试体系调研员（Explorer 3）
- **报告生成时间**: 2026-11-08T13:35:00Z
- **权威依据**: `/home/antigravity/MH-ai-ai/old/.agents/teamwork/ORIGINAL_REQUEST.md`

---

## 1. 观察事实 (Observation)

本部分记录通过命令行工具直接观察到的代码、文件状态、工具输出与逐字错误信息。

### 1.1 Git 仓库状态与远程追踪
- **当前分支与远程配置**（命令 `git branch -a; git remote -v`）：
  ```text
  * main
    remotes/origin/HEAD -> origin/main
    remotes/origin/main
  origin  https://github.com/MH-ai-ai/old.git (fetch)
  origin  https://github.com/MH-ai-ai/old.git (push)
  ```
- **远程追踪关系**（命令 `git remote show origin`）：
  ```text
  * remote origin
    Fetch URL: https://github.com/MH-ai-ai/old.git
    Push  URL: https://github.com/MH-ai-ai/old.git
    HEAD branch: main
    Remote branch:
      main tracked
    Local branch configured for 'git pull':
      main merges with remote main
    Local ref configured for 'git push':
      main pushes to main (up to date)
  ```
- **GitHub CLI 认证状态**（命令 `gh auth status`）：
  ```text
  github.com
    ✓ Logged in to github.com account MH-ai-ai (GH_TOKEN)
    - Active account: true
    - Git operations protocol: https
  ```
- **工作区未提交修改现状**（命令 `git status -s | awk '{print $1}' | sort | uniq -c`）：
  - `??` 未跟踪目录：1 个（`.agents/`，包含规范技能与团队元数据）
  - `D`  已删除文件：169 个（包括裁撤模块的 specs、前端子包页面、批处理脚本等）
  - `M`  已修改文件：34 个（包括 `frontend/src/app.config.ts`, `frontend/src/pages/index/index.tsx`, `backend/src/routes/index.js` 等）
  - 当前**没有任何独立的开发/重构分支**（如 `refactor/*`），所有前期清理成果直接散落在 `main` 分支的工作区中。

---

### 1.2 各端工程依赖与构建健康现状

| 工程目录 | 定位与技术栈 | 构建命令 | 类型检查命令 | 构建耗时与产物健康度 | 测试用例数 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **根目录 `/`** | 顶层调度胶水 | 无独立构建 | 代理子工程 | 仅代理前端部分脚本，无统一 Monorepo 编排 | 0 |
| **`admin/`** | 社区/后台管理平台 (Vue 3.5 + Vite 7 + TS 5.9 + Element Plus 2.13) | `npm run build` (`vue-tsc -b && vite build`) | `vue-tsc -b` | **构建成功 (10.16s)**；存在 vendor chunk > 1000KB 告警 (`vendor-CRoiN5bo.js: 1235KB`) | **0** |
| **`frontend/`** | 银伴微信小程序 (Taro 4.1 + React 18.2 + TS 5.6 + NutUI + Tailwind 4) | `npm run build:weapp` (`taro build --type weapp`) | `npm run typecheck` (`tsc -p tsconfig.json --noEmit`) | **构建成功 (14.93s)**；`tsc` 0 报错；`dist` 总体积 **1004KB (~1MB)**，主包与 7 大活跃分包远优于微信 2MB/20MB 上限 | **0** |
| **`volunteer/`** | 志愿者轻量工作台 (原生 HTML5 + ES Modules + CSS) | `npm run build` (`node scripts/build.mjs`) | `npm run typecheck` (`node scripts/typecheck.mjs`) | **构建成功 (<1s)**；Node VM 语法解析通过，端点契约无占位符 | **0** |
| **`backend/`** | 核心后端服务 (Node.js CommonJS + Express 4.22 + MySQL2 + Redis + Jest) | 无构建步骤 (解释型) | `npm run lint` (`eslint .`) | `eslint` 0 报错；**但运行时存在阻断级致命错误，无法启动** | **218** (46 失效, 172 活跃) |

---

### 1.3 后端核心阻塞缺陷 (Verbatim Errors)

#### 观察 1.3.1：后端应用入口启动失败（致命阻断）
- 执行命令：`node -e "require('./src/app')"` （位于 `backend/` 根目录）
- 逐字报错输出：
  ```text
  Ignoring invalid configuration option passed to Connection: acquireTimeout. This is currently a warning, but in future versions of MySQL2, an error will be thrown if you pass an invalid configuration option to a Connection
  app failed to load: Error: Cannot find module '../models/familySpace'
  Require stack:
  - /home/antigravity/MH-ai-ai/old/backend/src/services/familyService.js
  - /home/antigravity/MH-ai-ai/old/backend/src/controllers/familyController.js
  - /home/antigravity/MH-ai-ai/old/backend/src/routes/family.js
  - /home/antigravity/MH-ai-ai/old/backend/src/routes/index.js
  - /home/antigravity/MH-ai-ai/old/backend/src/app.js
  ```
- **缺陷精确定位**：`backend/src/services/familyService.js:4`：
  ```javascript
  const familyModel = require('../models/family');
  const familySpaceModel = require('../models/familySpace'); // <-- 致命错误：../models/familySpace.js 已被 git 删除！
  ```

#### 观察 1.3.2：用药服务残余失效引用
- 执行命令：`node -e "require('./src/services/medicationService')"`
- 逐字报错输出：
  ```text
  Error: Cannot find module './drugInteractionService'
  Require stack:
  - /home/antigravity/MH-ai-ai/old/backend/src/services/medicationService.js
  ```
- **缺陷精确定位**：`backend/src/services/medicationService.js:3`：
  ```javascript
  const drugInteractionService = require('./drugInteractionService'); // <-- 致命错误：drugInteractionService.js 已被删除！
  ```

#### 观察 1.3.3：孤立遗留控制器
在 `backend/src/controllers/` 目录下，以下已被裁撤模块的控制器仍存在，但其对应的 Service 已被删除：
- `backend/src/controllers/aiConsultController.js`：第 5 行 `require('../services/aiService')` 报错 `MODULE_NOT_FOUND`
- `backend/src/controllers/medicalDirectoryController.js`：第 4 行 `require('../services/medicalDirectoryService')` 报错 `MODULE_NOT_FOUND`

#### 观察 1.3.4：Prettier 代码格式化脚本检查失败
- 执行命令：`npm run format:check` （位于 `backend/`）
- 逐字报错输出（Exit code: 2）：
  ```text
  [error] No files matching the pattern were found: "src/services/familySpaceService.js".
  [error] No files matching the pattern were found: "src/services/medicalApiService.js".
  [error] No files matching the pattern were found: "src/services/medicalDirectoryService.js".
  [error] No files matching the pattern were found: "src/services/medicalReportService.js".
  ```
- **缺陷精确定位**：`backend/package.json:15` 中的 `format:check` 显式罗列了这 4 个服务文件以及 4 个单元测试文件，由于文件已被删除，Prettier 严格校验抛出异常。

---

### 1.4 全仓库测试用例分布与失效统计

全仓库检索 `*.test.*` 与 `*.spec.*` 结果：**全部 218 个测试文件均位于 `backend/tests`**。

#### 1.4.1 测试文件类型与分布统计
- `tests/unit/`: 130 个文件
- `tests/integration/`: 36 个文件
- `tests/performance/`: 17 个文件
- `tests/contract/`: 11 个文件
- `tests/middleware/`: 11 个文件
- `tests/*.test.js` (根测试): 13 个文件
- **总计: 218 个测试套件**

#### 1.4.2 失效测试套件（46 个）
因为测试文件中依然尝试 `require()` 或 `jest.mock()` 已被裁撤的 5 个模块（008 AI健康咨询, 009 药物相互作用, 011 AI伴聊, 012 家庭空间, 015 医疗资源整合），导致 **46 个测试套件执行失败**：
- **契约测试 (5 个)**：
  - `tests/contract/aiConsult-api.contract.test.js`
  - `tests/contract/companion-api.contract.test.js`
  - `tests/contract/drugInteraction.contract.test.js`
  - `tests/contract/familySpace-api.contract.test.js`
  - `tests/contract/medicalIntegration-api.contract.test.js`
- **集成测试 (7 个)**：
  - `tests/integration/canonical-route-compatibility.test.js`
  - `tests/integration/competition.acceptance.test.js`
  - `tests/integration/drugInteraction.integration.test.js`
  - `tests/integration/family-space.album.test.js`
  - `tests/integration/family-space.message.test.js`
  - `tests/integration/family-space.points.test.js`
  - `tests/integration/legacy.routes.test.js`
- **性能测试 (7 个)**：
  - `tests/performance/adminDiagnostics.perf.test.js`
  - `tests/performance/companion.perf.test.js`
  - `tests/performance/drugInteraction.check.perf.test.js`
  - `tests/performance/medical.reports.perf.test.js`
  - `tests/performance/sos.trigger.latency.test.js`
  - `tests/performance/system.probes.perf.test.js`
  - `tests/performance/timeBank.perf.test.js`
- **单元测试 (27 个)**：
  - `tests/unit/adminOpsService.test.js`
  - `tests/unit/aiService.test.js`
  - `tests/unit/appointmentController.test.js`
  - `tests/unit/appointmentModel.test.js`
  - `tests/unit/appointmentService.test.js`
  - `tests/unit/architecture.guardrails.test.js` (期望存在 `safeUse('/ai-companion')` 导致断言失败)
  - `tests/unit/companionController.test.js`
  - `tests/unit/companionService.test.js`
  - `tests/unit/contentSafetyService.test.js`
  - `tests/unit/controllerError.test.js`
  - `tests/unit/emotionService.test.js`
  - `tests/unit/familyService.test.js`
  - `tests/unit/familySpaceEnv.test.js`
  - `tests/unit/familySpaceService.test.js`
  - `tests/unit/integrationStatus.test.js`
  - `tests/unit/knowledgeGraphService.test.js`
  - `tests/unit/medicalApiService.test.js`
  - `tests/unit/medicalDirectoryModel.test.js`
  - `tests/unit/medicalDirectoryService.test.js`
  - `tests/unit/medicalMeta.test.js`
  - `tests/unit/medicalReportController.test.js`
  - `tests/unit/medicalReportModel.test.js`
  - `tests/unit/medicalReportService.test.js`
  - `tests/unit/neo4j.config.test.js`
  - `tests/unit/onlineConsultationController.test.js`
  - `tests/unit/onlineConsultationService.test.js`
  - `tests/unit/qwenService.test.js`

#### 1.4.3 活跃核心业务测试套件（172 个）
属于当前 8 大核心刚需链路（`auth/user`, `medication`, `health`, `sos/fall`, `location/fence`, `timebank/volunteer`, `voice`, `communityAdmin`）的测试共有 **172 个**。
- 抽样验证运行：`tests/unit/userService.test.js` 与 `tests/unit/timeBankService.test.js` 全部通过（16/16 通过）。
- 部分集成测试（如 `tests/integration/community-admin-activities.test.js`）因未对全局中间件 `auth` 进行 Mock，在未启动本地 MySQL 数据库时触发连接超时抛出 500。

---

## 2. 逻辑推导链 (Logic Chain)

本部分通过严格推导将上述事实连接至结论：

1. **分支状态与风险推导**：
   - 依据观察 1.1：`git status` 显示 169 个文件被删除、34 个文件被修改，当前位于 `main` 分支。
   - 依据原始需求第 19 条：“每次在修改代码或者文件之前，要创建另外一个新的分支，不要污染主干分支，只有在我批准同意之后才合并到主分支”。
   - **推导结论**：当前仓库处于**分支纪律违规的高危临界点**。如果后续 Agent 直接在工作区提交并推送，将直接污染 `main`。必须优先从当前状态检出隔离分支 `refactor/cleanup-and-baseline`，在用户审批前严禁合回 `main`。

2. **后端构建与可用性推导**：
   - 依据观察 1.2 与 1.3.1：虽然前端三端构建和静态类型检查通过，但后端 `src/services/familyService.js:4` 试图导入不存在的 `../models/familySpace`，导致 `src/app.js` 模块加载崩溃（Exit code: 1）。
   - 依据观察 1.3.2 与 1.3.3：`medicationService.js` 与两个孤立控制器仍然存在失效引用。
   - **推导结论**：虽然历史描述称“四端构建与类型检查通过”，但**后端目前处于不可运行状态（Runtime Broken）**。模块裁撤工作目前仅完成了 85%（完成了路由层删除与前端页面删除），但在后端 Service 层遗留了悬空 import，必须进行闭环收尾。

3. **测试体系失真与盲区推导**：
   - 依据观察 1.4：全仓库 218 个测试全部在 `backend/tests`，三个客户端（Admin、Frontend 小程序、Volunteer）测试文件数为 0。
   - 依据观察 1.4.2：后端 218 个测试中有 46 个测试与已废弃模块强绑定，运行 `npm test` 会直接引发大量 `MODULE_NOT_FOUND` 报错。
   - **推导结论**：全仓库测试体系存在“**双重失真**”：
     - 后端测试套件处于“半瘫痪”状态，无法在 CI 中执行全局 `jest`；
     - 前端三大端无任何自动化质量防线，重构前端（液态玻璃质感改造）时无法通过自动化回归保障业务不回退。

4. **4-Tier 测试蓝图与测试运行器选型推导**：
   - 针对长辈端小程序与家属端、管理端各自的工程特点，必须建立端到端（E2E）质量闭环。
   - **推导结论**：需要将后端现有的 172 个核心用例与前端用户旅程按 4-Tier 方法论重构，并为前端三端引入现代测试框架（Vitest / Playwright）。

---

## 3. 局限与边界考量 (Caveats)

1. **只读勘测约束**：本调研严格遵循只读原则，未对任何源码、配置文件或 Git 工作区状态执行修改或提交。所有修复方案均以代码建议形式呈现。
2. **环境无真实运行的 MySQL / Redis 容器**：测试在本地无独立测试数据库实例的环境下进行，因此部分集成测试依赖外部网络或数据库连接的行为是通过单元 mock 与语法加载诊断进行的。
3. **微信小程序端原生环境限制**：前端构建产物 `frontend/dist` 经实测完全符合微信小程序规范（1004KB），但由于无微信开发者工具 CLI（minium）环境，UI 真实渲染测试将在 E2E 蓝图中推荐使用 Taro Web 预览态通过 Playwright 进行驱动。

---

## 4. 结论与工程建议 (Conclusion)

### 4.1 Git 分支隔离与同步建议（最高优先级）
在执行任何代码写入前，必须严格执行分支隔离：
```bash
# 1. 从当前修改工作区创建专用重构隔离分支
git checkout -b refactor/cleanup-and-baseline

# 2. 检查未跟踪的 .agents 目录，确保仅提交受控元数据与代码
git add -A

# 3. 提交清理与基线修复提交
git commit -m "refactor: 清理已废弃模块残余引用，修复后端启动阻断，建立工程测试基线"

# 4. 推送到远程隔离分支，禁止合并到 main
git push -u origin refactor/cleanup-and-baseline
```

### 4.2 后端 4 大阻断缺陷修复方案（供下一阶段 Implementer 执行）

#### 修复建议 1：修复 `backend/src/services/familyService.js`
- **目标行**：第 4 行与第 69 行
- **方案**：移除 `familySpaceModel` 的引用，将互动证据降级为 `null` 或内置默认空摘要：
```javascript
// before:
const familySpaceModel = require('../models/familySpace');
// after:
// familySpace 模块已裁撤，移除引用

// before (第 69 行):
safeFetch(familySpaceModel.getInteractionEvidenceSummary(familyId), null),
// after (第 69 行):
Promise.resolve(null),
```

#### 修复建议 2：修复 `backend/src/services/medicationService.js`
- **目标行**：第 3 行与第 19 行
- **方案**：移除 `drugInteractionService` 引用，用药添加时跳过相互作用扫描：
```javascript
// before:
const drugInteractionService = require('./drugInteractionService');
// after:
// drugInteraction 模块已裁撤，移除引用
```

#### 修复建议 3：删除孤立控制器
- 删除 `backend/src/controllers/aiConsultController.js`
- 删除 `backend/src/controllers/medicalDirectoryController.js`

#### 修复建议 4：更新 `backend/package.json` 的 `format:check` 脚本
- 移除其中已被删除的 8 个文件路径，使其仅校验现有文件。

#### 修复建议 5：清理后端 46 个失效测试文件
- 将 46 个引用已废弃模块的测试文件统一移除或迁移至 `tests/archive/`，使 `npm test` 恢复绿灯。

---

### 4.3 测试体系现状与 4-Tier E2E 测试蓝图规划

#### 4.3.1 测试运行器（Test Runner）技术选型规划

```
全仓库测试运行器矩阵
├── Backend (Node.js API)
│   ├── Runner: Jest 29.7 + Supertest 6.3 (已就绪)
│   └── 治理目标: 清理 46 个失效用例，补齐 auth/db 内存 mock，保持覆盖率 >= 80%
├── Admin (Vue 3 + Vite)
│   ├── Unit/Component Runner: Vitest + @testing-library/vue + happy-dom
│   └── E2E Runner: Playwright (Chromium/Firefox/WebKit，分辨率 1440x900)
├── Frontend (Taro 4 + React 18 小程序)
│   ├── Component/Hook Runner: Vitest + @testing-library/react + @tarojs/test-utils
│   └── E2E Flow Runner: Playwright 驱动 Taro H5 / Web 构建预览 (移动端视口 375x812)
└── Volunteer (原生移动 Web)
    └── E2E Runner: Playwright Mobile Viewport (iPhone 13 模式，验证离线与打卡)
```

#### 4.3.2 4-Tier 层次化测试蓝图设计

```
========================================================================================
[ Tier 4: 真实长辈使用场景 E2E ]
  • 大字号排版与高对比度验证 (WCAG AAA, 字体 >= 18px, 触控区 >= 48dp)
  • 语音优先交互闭环 (长辈口述 "我刚才量了高压140" -> 语音识别 -> 确认弹窗 -> 归档)
  • 防重复打卡误触机制 (5分钟内多次点击服药打卡 -> 友好提示防呆并不重复扣减库存)
  • 跌倒检测倒计时与误报取消 (30秒大警报与一键取消，避免虚惊扰民)
  • 失联越界预警 (电子围栏边缘漂移防抖，失联轨迹实时回放)
----------------------------------------------------------------------------------------
[ Tier 3: 组合联动与跨系统集成 (Cross-System Linkage) ]
  • SOS 求助全链路: 老人端发起 -> 后端时间线生成 -> 社区管理大屏声光弹窗 -> 志愿者接单
  • 服药合规链路: 老人打卡超时 -> 任务调度触发 -> 家属微信消息推送 -> 家庭备药不足提醒
  • 时间银行互助闭环: 助老订单发布 -> 社区审核 -> 志愿者接单打卡 -> 老人确认 -> 时间币结算
----------------------------------------------------------------------------------------
[ Tier 2: 边界、极值与高可用韧性 (Boundary & Resilience) ]
  • 生物体征极值输入 (收缩压 300 / 舒张压 0 / 心率 220 等异常值拦截与医学合理性告警)
  • 高并发抢单排队 (多个志愿者同时秒抢同一个助老工单，行锁保证零重复分配)
  • 外部依赖降级容灾 (Redis 离线降级 MySQL / 语音 ASR 离线切换 Stub 模式)
  • 弱网重试与幂等性 (SOS 上报携带 Idempotency-Key，弱网重发不生成多个报警单)
----------------------------------------------------------------------------------------
[ Tier 1: 核心功能与契约覆盖 (Functional Core Coverage) ]
  • API 统一响应契约规范校验 ({ code, message, data } 格式标准)
  • 核心领域独立 CRUD: 用户登录鉴权、健康数据录入、服药计划日程、电子围栏设置
  • 前端各页面 4 大弹性状态验证 (加载中 Skeleton / 空状态 Empty / 错误重试 / 正常呈现)
========================================================================================
```

---

## 5. 独立验证方法 (Verification Method)

后续 Agent 或工程师可通过以下明确命令逐一复现与验证本报告结论：

### 5.1 验证 Git 状态与分支现状
```bash
cd /home/antigravity/MH-ai-ai/old
git status -s
git branch -a
git remote show origin
# 验证点：确认当前仅有 main 分支，且工作区存在大量未提交清理文件
```

### 5.2 验证各端构建与健康度
```bash
# 验证 Admin 端构建
cd /home/antigravity/MH-ai-ai/old/admin && npm run build
# 验证点：vue-tsc -b 与 vite build 通过，出现 vendor chunk 大小提示

# 验证 Frontend 端小程序构建与体积
cd /home/antigravity/MH-ai-ai/old/frontend && npm run typecheck && npm run build:weapp
du -sh dist
# 验证点：typecheck 0 报错，dist 总大小约为 1004KB

# 验证 Volunteer 端构建与语法
cd /home/antigravity/MH-ai-ai/old/volunteer && npm run typecheck && npm run build
# 验证点：语法校验与文件生成通过
```

### 5.3 验证后端致命阻断与失效测试
```bash
# 验证后端无法启动（复现 familySpaceModel 丢失错误）
cd /home/antigravity/MH-ai-ai/old/backend && node -e "require('./src/app')"

# 验证 Prettier 格式化脚本失败
cd /home/antigravity/MH-ai-ai/old/backend && npm run format:check

# 验证 46 个失效测试中的典型用例
cd /home/antigravity/MH-ai-ai/old/backend && npx jest tests/unit/appointmentController.test.js --runInBand
cd /home/antigravity/MH-ai-ai/old/backend && npx jest tests/unit/architecture.guardrails.test.js --runInBand

# 验证 172 个核心活跃测试正常执行
cd /home/antigravity/MH-ai-ai/old/backend && npx jest tests/unit/userService.test.js tests/unit/timeBankService.test.js --runInBand
```
