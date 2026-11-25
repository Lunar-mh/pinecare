# 青松安护（PineCare）智慧照护平台全面重构与规范治理日志 (REFACTOR_LOG.md)

## 一、重构背景与治理目标

青松安护（PineCare，原“银伴”）智慧照护平台面向中老年居家照护、家属协同监护、社区运营调度与志愿者上门服务四端协同场景。针对重构前仓库存在的历史冗余文件堆积、未落地业务分支多、部分前端视觉割裂与适老字号不统一、以及部分测试套件与路由契约脱节的问题，本次重构严格遵循分支隔离与规范治理原则推进完成：

1. **分支隔离与安全合并**：全程基于独立分支 `refactor/code-cleanup-and-frontend` 推进开发与多轮验证，禁止直接污染 `main` 主干；经全端构建与全量测试 100% 通过后合并至 `main` 并同步 GitHub 远端。
2. **业务路线瘦身收敛**：裁撤低完成度及偏离核心场景的非主线模块（AI 健康咨询、药物图谱、AI 伴聊、家庭空间、医疗集成、后端语音流代理、时间银行代币商城、社区活动与旧统计别名），将平台能力聚焦至 **4 大刚需主线**：
   - **居家健康监测 (Health)**：今日体征、7d/30d 趋势、手动录入与设备绑定同步；
   - **SOS 紧急呼救与跌倒监测 (SOS & Fall)**：一键求救（5 秒撤回）、跌倒监测（15 秒倒计时取消）、时序流水与紧急通知队列；
   - **慢病用药提醒 (Medication)**：用药计划编排、今日服药打卡、幂等防重复扣减、分布式定时提醒与补药预警；
   - **守护互助与社区协同 (Mutual Aid & Community)**：家属全景看护看板、社区助老工单流转、志愿者接单/签到/签退全闭环。
3. **前端“暖玉微晶·液态温润”适老化重塑**：彻底摒弃暗黑极客风格与零散冷灰配色，在小程序、管理后台、志愿者端全面落地“暖玉凝脂 (`#F8F6F0`) + 翡翠松青 (`#1F6B56`) + 暖栗琥珀 (`#C86D3B`) + 朱砂朱雀 (`#D33833`)”温润微晶设计系统与大字号/大热区适老排版标尺。

---

## 二、全周期里程碑与提交演进

| 阶段 | 核心提交 / 节点 | 关键交付与改动内容 |
|---|---|---|
| **前期规范与初筛** | 基线准备 | 沉淀 8 项领域工程规范 Skill 至 `.agents/skills/`；清理第一轮 5 个未落地模块及 40+ 临时脚本。 |
| **M0：分支隔离与启动恢复** | `437140c4`, `9bac9ee5`, `9350b55c` | 检出 `refactor/code-cleanup-and-frontend` 分支；修复后端失效模块引用阻断；清理孤儿控制器与模型；落盘架构契约 [PROJECT.md](PROJECT.md)。 |
| **Track A：E2E 基础设施** | `7b4acbe6` | 建立 4-Tier 端到端测试体系（纯内存沙盒驱动，7 套件 / 79 用例）并发布 [TEST_READY.md](TEST_READY.md)。 |
| **M1：后端瘦身与规范治理** | `69d7cd1d` | 物理裁撤 `/voice`、`/time-bank`、`/statistics`、`/community/activities` 等非核心模块（53 个文件清理）；统一 `yinban:` Redis 键命名空间 (`backend/src/config/redisKeys.js`) 与事务编排 (`backend/src/utils/transaction.js`)。 |
| **M2：小程序端适老重塑** | `77e6b748` | 清理冗余分包；搭建 `tokens.ts` 与 `variables.scss` 暖玉微晶体系；升级适老组件库并重塑首页 Bento、SOS、用药与健康大字报核心页面。 |
| **M3：管理端与志愿者端重构** | `27072f92` | 管理后台 Element Plus 暖玉微晶主题覆写、ECharts `shallowRef` 与 `dispose` 内存防泄漏、`chunk-echarts` 独立分包；志愿者端地图抽屉毛玻璃化与 60px 大按钮改造。 |
| **M4–M5：安全纵深加固、死链清除与全量终验** | `9e3d70f9`, `9d92d938` | 修复 `smsService` 失败计数窗口 TTL 与验证码锁定绕过风险；新增用药零剂量/负数及 XSS 校验边界；清理前后端残留死链路由与页面；项目更名为 **青松安护 (PineCare)**。 |
| **M6：唯一主分支收敛、死代码彻底清除与结构化重构** | 本轮提交 | 收敛至唯一主分支 `main`（清理历史分支与 worktree）；删除 150+ 过时/过程文档与失效截图/脚本；清除前后端残留死代码与未用环境变量校验；重构拆分志愿者端（5 模块 ESM）、管理后台看板、后端 `fall.js` / `authService.js` / `userService.js` 与 `adminOps` 模块。 |

---

## 三、M4–M5 关键加固与死链清理清单

### 3.1 后端安全边界与路由收口
1. **短信验证安全加固** (`backend/src/services/smsService.js`)
   - 修复 `VERIFY_FAIL_WINDOW_SECONDS` 错误引用 `redisKeys.TTL.SMS_FAIL`（`undefined`）的问题，对齐为 `redisKeys.TTL.SMS_VERIFY_FAIL`（`900` 秒）。
   - 将 `failCount >= VERIFY_FAIL_LIMIT` 锁定拦截前置到非生产环境测试码 `'000000'` 放行分支之前，消除失败锁定后通过测试码绕过的安全缝隙。
2. **用药计划输入校验增强** (`backend/src/services/medicationPlanService.js`)
   - 新增零剂量与非正数剂量拦截（拒绝 `"0"`、`"0mg"`、`"0.0"`、`"-1粒"` 等非法值，合法放行 `"0.5片"` 等正小数值）。
   - 新增 `medication_name` 与 `dosage` 的 XSS 危险特征字符拦截（拒绝 `<`、`>`、`javascript:`、`on*=` 负载）。
3. **社区管理接口契约对齐** (`backend/src/routes/community.js`, `backend/src/routes/adminOps.js`, `backend/src/services/communityAdmin/communityCareOpsService.js`, `backend/src/services/userPageConfigService.js`)
   - 移除 `community.js` 与 `adminOps.js` 中残留的已裁撤模块端点（`/medical/reports`、`/drug-interactions*`、`/time-bank/*`）。
   - 补全 `communityCareOpsService.getStats` 对 `communityAdminModel.getStatsData` 的安全委托，保障 `/api/v1/community/stats` 稳定可用。
   - 更新 `userPageConfigService.js` 下发的小程序页面配置，移除 `voice_ai` 与 `timebank` 失效跳转。

### 3.2 测试清理与 Tier 5 对抗强化
1. 物理清理 20 个归属已裁撤旧模块（`medicalApi`、`appointment`、`drugInteraction`、`qwen`、`neo4j`、`timeBank`、`aiConsult`、`companion`、`familySpace`、`voice`）的孤儿单测、合约与性能测试文件，并同步更新 `backend/scripts/freshInstallSmoke.js` 与 `backend/package.json` 的 `format:check` 清单。
2. 同步修复 Redis 键名规范（`yinban:auth:admin_session:*`、`yinban:auth:refresh:*`、`yinban:rate_limit:*`）、安全头策略、`admin` 会话 `sid` 鉴权与 `auth` 中间件隔离 mock，使全套单元/集成/合约测试全部恢复绿灯。
3. 新增 `backend/tests/e2e/tier5_security_boundaries.test.js` 及 `smsService.test.js` / `medicationPlanService.test.js` 边界用例，覆盖零剂量拦截、XSS 注入防御、短信防爆破与裁撤接口 404 验证。

### 3.3 前端三端死链清理与适老字号统一
1. **管理后台 (`admin/`)**
   - 彻底移除 `timebank` 路由、菜单入口、视图与服务模块；清除 `dashboard.ts` 对已裁撤 `/api/v1/statistics/*` 接口的请求，改为聚合 `/api/v1/community/stats`、`/api/v1/admin/health/overview`、`/api/v1/admin/sos/events` 与 `/api/v1/admin/system/stats` 真实数据源。
   - 将 `community/index.vue` 与 `services/community.ts` 从已裁撤的社区活动切换为真实有效的**社区助老工单调度**（`/api/v1/community/orders`）。
   - 将 `AdminLayout.vue`、`login/index.vue`、`dashboard/index.vue`、`style.css` 及各业务列表中残留的 `12px`/`13px` 辅助字号统一抬升至 ≥ `14px`。
2. **微信小程序端 (`frontend/`)**
   - 移除 `app.config.ts`、`design/navigation.ts`、`pages/index/index.tsx` 及 `services/modules/index.ts` 中对 `voice_ai` 与 `timebank` 分包及接口的引用，物理删除失效分包与模块文件。
   - 将 `pages/care/index.scss`（同步替换旧冷灰色系为暖玉微晶主调）、`pages/profile/index.tsx`、`EmptyState.tsx`、`ErrorBoundary.tsx` 及二线分包页面（`health/blood-pressure`、`health/heart-rate`、`health/records`、`location`）中的 `12px`/`13px`/`14px` 与 `text-xs`/`text-sm` 全面升级至 ≥ `16px`（`text-base` 及以上）。

---

## 四、M6 死代码清除与模块化重构明细

1. **分支收敛与陈旧垃圾清除**
   - 移除残留工作树与多余历史分支（`claude/exciting-cohen-acaa9b`、`copilot/vscode-mmya7uee-fafe`、`refactor/code-cleanup-and-frontend` 及远端分支），全仓仅保留唯一主分支 `main`。
   - 物理删除过程协作文档目录（`.agents/teamwork/`）、失效截图目录（`evidence/`）、过时脚本（`scripts/generate-frontend-evidence.js`、`backend/scripts/importMedicalDirectory.js`）、过时规格与设计草稿（`specs/006-voice-interaction/`、`specs/010-time-bank/`、`specs/main/`、`design/pages/`、旧“银伴”方案文档及零散 `项目说明.md`），并同步更新保留文档与配置。
2. **前后端死代码消除**
   - 后端删除 `drugDataParser.js`、`promptTemplate.js`、`familySwagger.js`、`models/adminOps/timeBank.js` 等无用模块；清理 `adminOpsController`、`communityAdminController`、`adminCareOverviewService`、`communityCareOpsService`、`mappers.js`、`medicalSosData.js`、`fallDrugData.js`、`validateCommunityAdmin.js` 中的已裁撤模块死方法；精简 `validateEnv.js`、`.env.example`、`.env.production-live.example`、`demoScenarios.js`、`evidenceBundle.js` 与 `userPageConfigService.js`。
   - 小程序端删除 `VoiceAssistant`、`VoiceEntryButton`、`type-modules/ai.ts` 与过期类型定义。
3. **核心巨型模块拆分优化**
   - **志愿者端 (`volunteer/src/`)**：将 1049 行单文件巨石 `app.js` 拆分为 `state.js`、`formatters.js`、`api.js`、`views.js` 与 `app.js` 5 个高内聚 ES 模块，并升级 `typecheck.mjs` / `build.mjs` 对全模块执行原生 `--check` 语法检查。
   - **管理后台 (`admin/src/views/dashboard/`)**：将 ECharts 配置建造与事件格式化逻辑从 `index.vue` 拆出至 `chartOptions.ts` 与 `formatters.ts`。
   - **后端核心模块 (`backend/src/`)**：修复 `models/fall.js` 损坏中文注释并提取公共查询/状态流转辅助方法；在 `authService.js` 与 `userService.js` 中提炼参数归一化与失败锁号辅助函数，显著降低函数长度与嵌套深度。

---

## 五、全仓最终实测验证结果

所有验证均在唯一主分支 `main` 最终修改后执行完成，退出码均为 `0`：

| 验证维度 | 执行命令 | 实测结果 | 状态 |
|---|---|---|---|
| **后端代码规范** | `cd backend && npm run lint` | 0 错误 0 警告 | PASS |
| **后端格式校验** | `cd backend && npm run format:check` | 全部目标文件格式合规 | PASS |
| **后端安全专项** | `cd backend && npm run test:security` | 15 suites / 56 tests 通过 | PASS |
| **后端 E2E (Tier 1–5)** | `cd backend && npm run test:e2e` | 8 suites / 83 tests 通过 | PASS |
| **后端回归 (单测/集成/合约/性能)** | `cd backend && npx jest tests/unit tests/integration tests/contract tests/performance --runInBand --coverage=false` | 134 suites / 504 tests 通过 | PASS |
| **管理后台构建** | `cd admin && npm run build` | `vue-tsc` + `vite build` (2241 模块) 0 错误 | PASS |
| **志愿者端校验与构建** | `cd volunteer && npm run typecheck && npm run build` | 5 模块语法检查与打包通过 | PASS |
| **小程序类型与构建** | `cd frontend && npm run typecheck && npm run build:weapp` | 类型检查与 Taro 编译通过（主包 **552.06 KB**，总包 **721.59 KB**，远低于 2MB 红线） | PASS |
