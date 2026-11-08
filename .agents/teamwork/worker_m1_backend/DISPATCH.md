## 2026-11-08T13:56:27Z
【身份与工作目录】：
你是由 Project Orchestrator 委派的“后端路线精简与规范治理实施员（Worker M1）”。
- 你的专属工作目录：/home/antigravity/MH-ai-ai/old/.agents/teamwork/worker_m1_backend/
- 用户原始需求路径（必须首要研读）：/home/antigravity/MH-ai-ai/old/.agents/teamwork/ORIGINAL_REQUEST.md
- 架构契约与特性清册（必须全文对齐）：/home/antigravity/MH-ai-ai/old/PROJECT.md
- 父协调者会话ID：8cea2f46c026fd00f3b48d89dfef6e59
- 代码仓库后端路径：/home/antigravity/MH-ai-ai/old/backend

【MANDATORY INTEGRITY WARNING 铁律】：
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

【你的专属写权限与专属任务（Milestone 1）】：
你拥有 backend/ 源码（src/）及单元测试目录的独占实施权限（请勿与 backend/tests/e2e/ 冲突）。严格对标 clean-code-standards, backend-architecture, backend-business-logic 规范。

1. **果断物理裁撤 4 大次要枝节模块**：
   - 裁撤语音交互模块 (`/voice`)：物理删除 `src/routes/voice.js`、`src/controllers/voiceController.js`、`src/services/voiceInteractionService.js`、`src/services/voiceService.js`、`src/services/asrService.js`、`src/services/ttsService.js`、`src/models/voice.js`、`src/middleware/voiceValidators.js`、`src/config/voiceEnv.js`；在 `src/routes/index.js` 中彻底卸载 `/voice` 路由。
   - 裁撤时间银行代币与商城模块 (`/time-bank`)：物理删除 `src/routes/timeBank.js`、`src/controllers/timeBankController.js`、`src/services/timeBankService.js`、`src/services/timeBank/` 整个目录、`src/models/timeBank/` 整个目录、`src/middleware/validateTimeBank.js`；在 `src/routes/index.js` 中彻底卸载 `/time-bank` 路由。
   - 裁撤社区文娱活动模块 (`/community/activities`)：从 `src/routes/community.js` 中剔除活动创建与查询路由；删除 `src/services/communityAdmin/communityActivityService.js` 与 `src/models/communityAdmin/activities.js`。
   - 裁撤统计重复别名路由 (`/statistics`)：删除 `src/routes/statistics.js`、`src/controllers/statisticsController.js`、`src/services/statisticsService.js`、`src/models/statisticsModel.js`；在 `src/routes/index.js` 中彻底卸载 `/statistics` 路由。

2. **精细收敛并加固 4 大刚需核心主线**：
   - 居家健康监测：收拢监测硬件绑定接口至 `src/routes/healthArchive.js` 下的 `/health/devices`（GET 列表、POST bind、POST unbind、POST set-primary）；保持今日快照、体征趋势、手动录入高度健壮；
   - SOS 紧急呼救：保障 5 秒撤销、15 秒跌倒取消、全时序记账流水 (`eventTimelineService`) 毫秒级可靠；
   - 用药提醒：保障用药计划编排、今日时间轴、服药打卡确认、分布式定时任务稳定性；
   - 守护互助：家属端一屏统览 (`/family/elderly-overview`) + 志愿者工单接单与上门签到签退 (`/volunteer/tasks/*`)，志愿者累计服务工时归档至个人资料。

3. **后端架构与 Clean Code 深度治理**：
   - **服务层事务辅助**：在 `backend/src/utils/transaction.js` 中封装统一的 `runInTransaction(async (conn) => { ... })`，在 SOS 触发/结案与志愿者服务完成工时结算中实施严格事务控制与释放；
   - **Redis 键规范收口**：在 `backend/src/config/redisKeys.js` 中统一收口所有 Redis 键定义，严格实施 `yinban:{module}:{entity}:{id}` 根命名空间与显式 TTL；
   - **核心 JSDoc 中文注释全量补齐**：为控制器（`authController`, `healthController`, `sosController`, `medicationLogController`, `volunteerController` 等）、服务层核心函数、数据模型层补齐标准清晰的中文 JSDoc 注释（约 105 个核心方法）；
   - **ESLint 代码质量收紧**：在 `eslint.config.js` 中恢复 `'no-unused-vars': 'error'` 与 `'no-useless-catch': 'error'`；
   - **清理 46 个失效测试**：将依赖已裁撤模块（AI咨询、药物相互作用、家庭空间相册、时间银行代币、语音交互等）的测试文件物理清理或重构，确保 `npx jest tests/unit tests/integration` 运行 100% 绿灯！

4. **独立验证与健康校验**：
   - 验证 `node -e "require('./src/app')"` 启动 0 报错；
   - 运行全部存留后端单元/集成测试，确保全部通过（0 失败）；
   - 运行 `npm run lint` 和 `npm run format:check`，确保 0 违规。

5. **提交并推送到 GitHub 远程**：
   - `git add -A`
   - `git commit -m "feat(backend): 物理裁撤次要模块，加固4大核心主线，统一Redis键命名与事务编排，补齐核心JSDoc注释"`
   - `git push origin refactor/code-cleanup-and-frontend`

6. **产出交接报告**：
   - 在 /home/antigravity/MH-ai-ai/old/.agents/teamwork/worker_m1_backend/handoff.md 详细记录删除的文件清单、重构的方法、新增事务与Redis工具、单测通过结果，并使用 send_message 向协调者汇报。
7. 全程严格使用中文。
