# 实施计划: 家属端基础功能

**分支**: `005-family-app` | **日期**: 2025-07-18

## 概述
银伴平台家属端远程看护功能。包括登录绑定、查看健康数据、异常预警、用药提醒同步、SOS通知等。

## 技术背景
**语言/版本**: Node.js 18.x, Express 4.x, MySQL 8.0, Redis 7.x  
**主要依赖**: Taro 4.x (前端), Express (后端), mysql2, ioredis  
**存储**: MySQL + Redis  
**Testing**: Jest + Supertest (后端), Vitest (前端)  
**Target Platform**: 微信小程序  
**Project Type**: 移动端小程序 + 后端API服务  
**Performance Goals**: 健康数据同步延迟 <5秒, SOS通知延迟 <3秒  
**Constraints**: 数据访问需老人端授权绑定, 仅可查看已绑定老人数据  
**Scale/Scope**: MVP阶段支持万级用户

## 宪法检查
| 宪法原则 | 检查结果 | 说明 |
|----------|----------|------|
| 数据真实性 | ✅ PASS | 家属端只展示真实的老人健康数据 |
| 可落地优先 | ✅ PASS | 基于已有001/002/003/004模块数据，无额外存储 |
| 中文优先 | ✅ PASS | 全程中文界面与交互 |
| 删繁就简 | ✅ PASS | MVP只做数据展示与SOS通知，不重复开发业务逻辑 |
| 前后一致性 | ✅ PASS | 与001-004各模块数据结构保持一致 |
| 分阶段交付 | ✅ PASS | MVP绑定+数据查看，后续扩展家属主动干预 |
| 适老化设计 | ✅ PASS | 家属端重点关注数据可读性与告警推送及时性 |

## 项目结构
### Documentation (this feature)

```text
specs/005-family-app/
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
│   ├── controllers/familyController.js
│   ├── services/familyService.js
│   ├── services/bindingService.js
│   ├── models/familyBinding.js
│   ├── routes/family.js
│   └── middleware/familyAuth.js
├── tests/
└── package.json

# 前端小程序
frontend/
├── src/pages/family/
├── src/components/health-summary/
├── src/services/familyService.js
└── package.json
```

**Structure Decision**: 采用前后端分离架构（Option 2），后端Node.js+Express，前端Taro跨端小程序。家属端通过绑定关系访问老人数据，不存储独立业务数据。

## 跨模块依赖
| 依赖模块 | 依赖类型 | 说明 |
|----------|----------|------|
| 001-user-auth | 强依赖 | 家属账号注册、JWT鉴权、家属绑定老人账号 |
| 002-health-archive | 读依赖 | 家属端展示老人健康数据与历史趋势 |
| 003-medication-reminder | 读依赖 | 家属端展示老人用药计划与服药记录 |
| 004-emergency-sos | 推送依赖 | 家属接收SOS紧急通知，查看SOS事件详情 |

## 指标口径与观测

- **响应时间**：默认以 p95 口径度量；起止点为“网关/服务入口接收请求”到“返回响应”的服务端耗时。
- **成功率**：以业务成功码（如 `code=0`）与 HTTP 状态码综合统计；需明确计入/排除的失败类型。
- **外部依赖**：第三方 API 超时/限流/不可用应单独计数，并在错误语义中区分。
- **审计与隐私**：访问敏感数据的关键行为需记录审计日志；日志字段需脱敏。

## Complexity Tracking

> 无宪法违规，无需特别说明
