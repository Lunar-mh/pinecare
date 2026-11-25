# BRIEFING — 2026-11-08T13:38:00Z

## Mission
全面勘测后端源码架构与业务全景，产出模块裁撤清册、核心4大主线接口边界定义、三层架构合规排查与注释重构建议报告。

## 🔒 My Identity
- Archetype: explorer
- Roles: 后端架构与业务裁撤调研员
- Working directory: /home/antigravity/MH-ai-ai/old/.agents/teamwork/explorer_survey_1
- Original parent: 8cea2f46c026fd00f3b48d89dfef6e59
- Milestone: M1 业务与代码勘测阶段

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- 严禁直接修改任何源码与配置文件
- 严格遵循 .agents/skills/ 规范与三层分层约束
- 全程使用中文

## Current Parent
- Conversation ID: 8cea2f46c026fd00f3b48d89dfef6e59
- Updated: 2026-11-08T13:38:00Z

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md` 与全局 8 大技能库 (`backend-architecture`, `backend-business-logic`, `clean-code-standards`)
  - `backend/src/app.js`, `server.js`, `package.json`
  - `backend/src/routes/` (全量 16 组业务前缀路由)
  - `backend/src/controllers/`, `services/`, `models/`, `jobs/`, `middleware/`, `config/`, `utils/`
  - `backend/migrations/` 与 `backend/tests/` (单元/集成测试通过率验证)
- **Key findings**:
  - 发现历史初步裁撤导致的阻断性致命错误：`src/services/familyService.js:4` 仍在 `require('../models/familySpace')`，导致真实 `app.js` 启动直接抛出 `MODULE_NOT_FOUND` 崩溃。
  - 发现 12 处已废弃模块的僵尸代码残留（`aiConsultController.js`, `medicalDirectoryController.js`, `onlineConsultationModel.js`, 4 个中间件等）。
  - 果断提出新一轮 4 个次要枝节模块裁撤清单：语音助手 (`/voice`)、时间银行代币与商城 (`/time-bank`)、社区文娱活动 (`/community/activities`)、统计别名 (`/statistics`)。
  - 精细界定并收敛出 4 大高价值刚需主线（居家健康监测、SOS紧急呼救、用药提醒、守护互助）的职责与接口边界。
  - 诊断出事务层级倒置（Service缺事务/Model包事务）、Redis键命名缺少 `yinban:` 命名空间根、MySQL连接参数 `acquireTimeout` 弃用告警、ESLint规则过度放宽等整改点。
- **Unexplored areas**:
  - 前端小程序端与管理中台的对应接口联动（交由前端调研员与后续实施团队承接）。

## Key Decisions Made
- 建议彻底物理清理坏死残留代码，修复 `familyService.js` 阻断点。
- 将“守护互助”主线收敛为“纯净的志愿者工单服务打卡与时长存证”，坚决剔除虚拟代币交易与积分排行榜。
- 将设备绑定统一收口至 `/health/devices/*` 命名空间。
- 编制详尽的 JSDoc 注释补齐计划与三层架构规范整改方案。

## Artifact Index
- DISPATCH.md — 父协调者分派指令记录
- BRIEFING.md — 运行记忆与状态索引
- progress.md — 心跳与阶段进度追踪
- handoff.md — 《后端代码全景、业务裁撤与重构梳理报告》（核心产物）
