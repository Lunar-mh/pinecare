# 总体执行计划：全仓库代码梳理瘦身与液态玻璃温润适老前端重构

## 一、项目目标与核心原则
1. **最高权威指引**：严格遵循 `ORIGINAL_REQUEST.md` 中的所有需求。
2. **分支隔离铁律**：所有代码修改必须在专属新分支 `refactor/code-cleanup-and-frontend` 下进行，严禁直接提交 main 分支，仅在最终验收通过且获用户批准后方可合入主干。
3. **8大架构规范落实**：全面对标 `.agents/skills/` 规范（clean-code-standards, backend-architecture, taro-react-elderly-ui, vue3-composition-api, frontend-design 等）。
4. **业务路线聚焦瘦身**：坚决剔除不可落地与次要无价值模块，死磕居家健康监测、SOS呼救、用药提醒、守护互助 4 大刚需核心主线。
5. **温润适老“液态玻璃”视觉重构**：全面重构小程序、管理后台与志愿者端，摒弃极客暗黑，打造端庄典雅、大字号大热区、高对比度的液态玻璃质感界面。
6. **过程日志与远程同步**：全程详实记录工作日志并实时 push 同步至 GitHub 远程仓库。

---

## 二、分阶段实施里程碑

### Phase 0: 全景勘测与调研（Survey Phase）
- **目标**：在不改动任何源码的前提下，通过 3 位 Explorer 并行进行三维深度摸排。
- **任务分配**：
  - `explorer_survey_1`（后端与业务路线摸排）：全面梳理 `backend/` 结构、路由接口、现有模块功能、识别冗余代码/历史脚本及可进一步撤掉的次要枝节模块，拟定核心保留主线与注释补充计划。
  - `explorer_survey_2`（前端三端与液态玻璃适老调研）：全面研读 `frontend/` (Taro/React)、`admin/` (Vue3)、`volunteer/` 前端代码，分析当前组件架构、UI 库（NutUI / Element Plus / Tailwind 等）、色彩体系、字号热区排版，结合规范规划“液态玻璃适老质感”视觉重构方案。
  - `explorer_survey_3`（工程基准、Git状态与测试现状）：调研当前 Git 分支状态、远程连接、测试用例现状、构建检查基线，评估瘦身清理的工程影响。
- **交付物**：3 份详尽的勘测 Handoff 报告，汇总形成 `PROJECT.md`（含完整特性清册与裁撤清单）。

### Phase 1: 分支建立与基线校准
- **目标**：严格执行分支铁律，建立隔离重构分支，完成工程基准健康校验。
- **任务**：
  - 由 Worker 执行从当前分支检出创建并切换到 `refactor/code-cleanup-and-frontend` 分支。
  - 推送新建分支到 GitHub 远程仓库建立追踪。
  - 验证初始状态下各端构建无阻断错误。

### Phase 2: 编制正式架构规划与契约（PROJECT.md）
- **目标**：明确模块边界、裁撤清单、保留模块接口契约、适老视觉规范与设计系统。
- **内容**：
  - 核心保留链路：1. 居家健康监测（含数据上报、指标趋势、异常告警）；2. SOS紧急呼救（即时报警、地理定位、家属/志愿者联动、事件回溯）；3. 用药提醒（定时提醒、服用确认、家属知会）；4. 守护互助（亲友绑定、志愿者接单响应、关怀走访）。
  - 明确撤掉的非核心/低价值模块清单。
  - 前端“液态玻璃”适老设计规范契约（色彩Token、背景光斑/模糊度、玻璃边框/微高光、无障碍排版字号标准）。

### Phase 3: 双轨并行实施
- **E2E 测试轨**（由 E2E Testing Orchestrator 统筹）：
  - 编写 `TEST_INFRA.md`。
  - 构建覆盖 4 大核心主线的 4-Tier 严密黑盒测试体系（Tier 1 功能覆盖、Tier 2 边界极值、Tier 3 组合联动、Tier 4 真实长辈使用场景）。
  - 验证通过后发布 `TEST_READY.md`。
- **实施轨 Milestone 1：后端业务裁撤、代码瘦身与注释补齐**（由 Sub-Orchestrator 统筹）：
  - 清理废弃路由、冗余控制层与服务层代码。
  - 严格按照 Controller -> Service -> Model 三层架构重构核心链路。
  - 补齐全量核心函数/接口/关键逻辑的高质量中文注释。
  - 强化统一响应 `{code, message, data}` 与异常防御。
  - 运行全量构建和后端测试，达成门禁验收。
- **实施轨 Milestone 2：三端前端温润适老“液态玻璃”全面重构**（由 Sub-Orchestrator 统筹）：
  - 小程序端（Taro/React）：遵循 `taro-react-elderly-ui`，大字号、大触控热区、液态玻璃通透卡片、长辈/家属双模式。
  - 管理中台端（Vue3）：遵循 `vue3-composition-api`，统一典雅稳重的液态玻璃卡片与数据大屏。
  - 志愿者端：响应式适配，温润亲和的抢单与服务流转。
  - 严格构建测试通过，完成 Reviewer 与 Challenger 门禁验证。

### Phase 4: 全量 E2E 验收与对抗性强化
- **Phase 1**：基于 `TEST_READY.md` 跑通 100% E2E 测试（Tiers 1-4）。
- **Phase 2**：派生 Challenger 执行 Tier 5 对抗性与覆盖率空隙挖掘，修补潜藏漏洞。

### Phase 5: 司法级完整性审计与远程提交归档
- **Forensic Auditor 独立审计**：执行作弊/占位符/硬编码/伪造逻辑全量排查，一票否决制。
- **远程同步与日志归档**：
  - 撰写完整的重构工作日志文档（`REFACTOR_LOG.md`）。
  - 执行 `git status` / `git diff` 核对，将所有变更与工作日志 push 到 GitHub 远程 `refactor/code-cleanup-and-frontend` 分支。
- **向哨兵汇报**：发送包含分支链接、修改清单与验证证据的结构化报告，准备迎接 Victory Audit。
