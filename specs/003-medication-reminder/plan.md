# Implementation Plan: 智慧用药提醒

**Branch**: `003-medication-reminder` | **Date**: 2025-07-18 | **Spec**: `.specify/specs/003-medication-reminder/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

银伴平台MVP核心功能：按时用药提醒。包括添加用药计划、收到用药提醒、查看用药历史、家属同步提醒、续药提醒等。采用微信服务通知推送，后端定时任务触发提醒。

## Technical Context

**Language/Version**: Node.js 18.x, Express 4.x, MySQL 8.0, Redis 7.x  
**Primary Dependencies**: Taro 4.x (前端), Express (后端), mysql2, ioredis, node-cron (定时任务), 微信服务通知  
**Storage**: MySQL (用药计划/记录) + Redis (缓存/任务队列)  
**Testing**: Jest + Supertest (后端), Vitest (前端)  
**Target Platform**: 微信小程序 + Web管理后台  
**Project Type**: 移动端小程序 + 后端API服务  
**Performance Goals**: 提醒送达率 >99%, 确认率 >90%, 家属同步延迟 <10秒  
**Constraints**: 需用户主动订阅消息, 定时任务需保证可靠性  
**Scale/Scope**: MVP阶段支持万级用户

## Constitution Check

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

## Project Structure

### Documentation (this feature)

```text
specs/003-medication-reminder/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── openapi.yaml    # API接口定义
└── tasks.md            # Phase 2 output
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

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
