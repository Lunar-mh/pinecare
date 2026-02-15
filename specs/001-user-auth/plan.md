# Implementation Plan: 用户注册与身份认证

**Branch**: `001-user-auth` | **Date**: 2025-07-18 | **Spec**: `.specify/specs/001-user-auth/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

银伴平台MVP核心功能：老人端用户注册登录与身份认证。包括手机号+验证码注册、微信一键登录、家属绑定、紧急联系人设置、账户安全保护等核心功能。前端采用Taro跨端框架，后端采用Node.js + Express + MySQL + Redis。

## Technical Context

**Language/Version**: Node.js 18.x, Express 4.x, MySQL 8.0, Redis 7.x  
**Primary Dependencies**: Taro 4.x (前端), Express (后端), mysql2, ioredis, jsonwebtoken, bcrypt, aliyun-sms (短信), wechat-auth (微信登录)  
**Storage**: MySQL (用户数据) + Redis (验证码缓存/Session)  
**Testing**: Jest + Supertest (后端), Vitest (前端)  
**Target Platform**: 微信小程序 + Web管理后台  
**Project Type**: 移动端小程序 + 后端API服务  
**Performance Goals**: 接口响应 <500ms, 注册流程 <3秒  
**Constraints**: 微信登录需AppID配置, 短信需阿里云/腾讯云服务, 验证码5分钟有效  
**Scale/Scope**: MVP阶段支持万级用户

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 宪法原则 | 检查结果 | 说明 |
|----------|----------|------|
| 数据真实性 | ✅ PASS | 使用官方微信登录API，验证码符合行业标准 |
| 可落地优先 | ✅ PASS | 采用成熟技术方案，微信登录有成熟SDK |
| 中文优先 | ✅ PASS | 全程中文设计，代码注释中文 |
| 删繁就简 | ✅ PASS | 技术栈精简，MVP优先，不过度设计 |
| 前后一致性 | ✅ PASS | 文档数据一致 |
| 分阶段交付 | ✅ PASS | MVP核心功能，后续迭代扩展 |
| 适老化设计 | ✅ PASS | 注册流程简单，核心操作步骤少 |

## Project Structure

### Documentation (this feature)

```text
specs/001-user-auth/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── openapi.yaml    # API接口定义
└── tasks.md            # Phase 2 output (NOT created by /speckit.plan)
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
│   └── utils/         # 工具函数
├── tests/
│   ├── contract/       # 契约测试
│   ├── integration/   # 集成测试
│   └── unit/          # 单元测试
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

**Structure Decision**: 采用前后端分离架构，后端Node.js+Express，前端Taro跨端小程序。数据库MySQL + Redis缓存。API接口遵循RESTful规范。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
