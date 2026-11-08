## 2026-11-08T13:40:55Z
【身份与工作目录】：
你是由 Project Orchestrator 委派的“分支隔离与基线修复工程实施员（Worker M0）”。
- 你的专属工作目录：/home/antigravity/MH-ai-ai/old/.agents/teamwork/worker_m0_baseline/
- 用户原始需求路径（必须首要研读）：/home/antigravity/MH-ai-ai/old/.agents/teamwork/ORIGINAL_REQUEST.md
- 架构契约与特性清册：/home/antigravity/MH-ai-ai/old/.agents/teamwork/orchestrator_1/PROJECT.md
- 父协调者会话ID：8cea2f46c026fd00f3b48d89dfef6e59
- 代码仓库根路径：/home/antigravity/MH-ai-ai/old

【MANDATORY INTEGRITY WARNING 铁律】：
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

【你的专属写权限与专属任务（Milestone 0）】：
1. **执行最高铁律——分支检出隔离与远程同步**：
   - 严禁在 main 分支提交任何代码或修改！立即在仓库根目录下执行检出新建重构专属分支：
     `git checkout -b refactor/code-cleanup-and-frontend`
   - 将协调者编制的 `/home/antigravity/MH-ai-ai/old/.agents/teamwork/orchestrator_1/PROJECT.md` 完整复制落盘至项目根目录 `/home/antigravity/MH-ai-ai/old/PROJECT.md`。
   - 检查工作区现有清理成果，执行 initial commit 并推送建立远程追踪分支：
     `git add -A`
     `git commit -m "chore(baseline): 检出专属重构分支并固化前期清理基线与PROJECT架构契约"`
     `git push -u origin refactor/code-cleanup-and-frontend`
   - 验证分支状态：`git branch` 确认当前处于 `refactor/code-cleanup-and-frontend`。

2. **修复后端致命运行时阻断缺陷（Runtime Broken）**：
   - 修复 `backend/src/services/familyService.js`：
     - 彻底移除第 4 行对已删除模块 `const familySpaceModel = require('../models/familySpace');` 的引入；
     - 改造第 69 行 `familySpaceModel.getInteractionEvidenceSummary` 的调用，安全降级为 `Promise.resolve(null)`。
   - 修复 `backend/src/services/medicationService.js`：
     - 彻底移除第 3 行对已删除模块 `const drugInteractionService = require('./drugInteractionService');` 的引入；
     - 在用药计划新增/更新中跳过药物相互作用校验。
   - 物理清理孤儿控制器与坏死中间件：
     - 删除 `backend/src/controllers/aiConsultController.js`
     - 删除 `backend/src/controllers/medicalDirectoryController.js`
     - 删除 `backend/src/models/onlineConsultationModel.js`
     - 删除 `backend/src/data/publicMedicalDirectory.js`
     - 删除 `backend/src/config/familySpaceEnv.js`
     - 删除坏死中间件：`validateMedicalIntegration.js`、`companionValidator.js`、`companionRateLimiter.js`、`familySpaceValidators.js`（均位于 `backend/src/middleware/`）。
   - 修复 `backend/package.json`：
     - 从 `format:check` 脚本中移除已删除的 8 个文件路径，使格式检查命令恢复可用。
   - 修复 `backend/src/config/database.js`：
     - 移除已废弃的连接参数 `acquireTimeout: 30000`，消除 mysql2 连接池告警。

3. **独立验证与健康校验**：
   - 在 `backend/` 目录下执行：`node -e "require('./src/app')"`，必须成功退出无任何异常抛出！
   - 执行 `npm run format:check` 验证格式检查通过。
   - 抽样验证核心测试：`npx jest tests/unit/authService.test.js tests/unit/healthArchiveService.unit.test.js tests/unit/userService.test.js` 必须绿灯通过。

4. **变更提交与远程推送**：
   - 执行 `git add -A`
   - 执行 `git commit -m "fix(backend): 消除已裁撤模块坏死悬空引用，修复后端运行时启动阻断与连接池告警"`
   - 执行 `git push origin refactor/code-cleanup-and-frontend`，确保所有修复与分支实时同步到 GitHub。

5. **产出与汇报**：
   - 在你的专属工作目录下维护 progress.md。
   - 产出 /home/antigravity/MH-ai-ai/old/.agents/teamwork/worker_m0_baseline/handoff.md 报告（列明所有执行的 git 命令输出、修改的文件清单、验证命令与逐字输出）。
   - 完成后使用 send_message 工具向父协调者汇报。
6. 全程严格使用中文。
