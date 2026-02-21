# 实施计划: 智慧用药提醒

**分支**: `003-medication-reminder` | **日期**: 2025-07-18 | **规格**: `.specify/specs/003-medication-reminder/spec.md`

**说明**: 本文件由 `/speckit.plan` 命令生成。执行流程见 `.specify/templates/commands/plan.md`。

## 概述
银伴平台MVP核心功能：按时用药提醒。包括添加用药计划、收到用药提醒、查看用药历史、家属同步提醒、续药提醒等。采用微信服务通知推送，后端定时任务触发提醒。

## 技术背景
**语言/版本**: Node.js 18.x, Express 4.x, MySQL 8.0, Redis 7.x  
**主要依赖**: Taro 4.x (前端), Express (后端), mysql2, ioredis, node-cron (定时任务), 微信服务通知  
**存储**: MySQL (用药计划/记录) + Redis (缓存/任务队列)  
**Testing**: Jest + Supertest (后端), Vitest (前端)  
**Target Platform**: 微信小程序 + Web管理后台  
**Project Type**: 移动端小程序 + 后端API服务  
**Performance Goals**: 提醒送达率 >99%, 确认率 >90%, 家属同步延迟 <10秒  
**Constraints**: 需用户主动订阅消息, 定时任务需保证可靠性  
**Scale/Scope**: MVP阶段支持万级用户

## 宪法检查
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 宪法原则 | 检查结果 | 说明 |
|----------|----------|------|
| 数据真实性 | ✅ PASS | 用药数据真实记录，不捏造 |
| 可落地优先 | ✅ PASS | 微信服务通知有成熟方案 |
| 中文优先 | ✅ PASS | 全程中文设计 |
| 删繁就简 | ✅ PASS | MVP技术栈精简 |
| 前后一致性 | ✅ PASS | 文档数据一致 |
| 分阶段交付 | ✅ PASS | MVP核心功能，药物冲突后续版本 |
| 适老化设计 | ✅ PASS | 简单操作流程，大字展示 |

## 项目结构
### Documentation (this feature)

```text
specs/003-medication-reminder/
├── plan.md              # This file
├── research.md          # 阶段0产物
├── data-model.md        # 阶段1产物
├── quickstart.md        # 阶段1产物
├── contracts/           # 阶段1产物
│   └── openapi.yaml    # API接口定义
└── tasks.md            # 阶段2产物
```

### Source Code (repository root)

```text
# 后端服务
backend/
├── src/
│   ├── config/         # 配置文件
│   ├── controllers/    # 控制器
│   ├── middleware/    # 中间件
│   ├── models/         # 数据模型
│   ├── routes/         # 路由
│   ├── services/       # 业务逻辑
│   ├── jobs/           # 定时任务
│   └── utils/         # 工具函数
├── tests/
│   ├── contract/
│   ├── integration/
│   └── unit/
└── package.json

# 前端小程序
frontend/
├── src/
│   ├── components/    # 公共组件
│   ├── pages/         # 页面
│   ├── services/      # API服务
│   ├── store/         # 状态管理
│   └── utils/         # 工具函数
├── tests/
└── package.json
```

**Structure Decision**: 采用前后端分离架构，后端Node.js+Express，前端Taro跨端小程序。数据库MySQL + Redis缓存。定时任务使用node-cron。API接口遵循RESTful规范。

## 跨模块依赖
| 依赖模块 | 依赖类型 | 说明 |
|----------|----------|------|
| 001-user-auth | 强依赖 | JWT鉴权，微信openid与用户绑定 |
| 009-drug-interaction | 被依赖 | 用户添加新药物时，009模块调用本模块用药数据进行冲突检测 |

## 指标口径与观测

- **响应时间**：默认以 p95 口径度量；起止点为“网关/服务入口接收请求”到“返回响应”的服务端耗时。
- **成功率**：以业务成功码（如 `code=0`）与 HTTP 状态码综合统计；需明确计入/排除的失败类型。
- **外部依赖**：第三方 API 超时/限流/不可用应单独计数，并在错误语义中区分。
- **审计与隐私**：访问敏感数据的关键行为需记录审计日志；日志字段需脱敏。

## Complexity Tracking

> 无宪法违规，无需特别说明
