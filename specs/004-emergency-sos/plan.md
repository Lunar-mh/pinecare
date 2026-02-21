# 实施计划: 一键紧急救援

**分支**: `004-emergency-sos` | **日期**: 2025-07-18 | **规格**: `.specify/specs/004-emergency-sos/spec.md`

## 概述
银伴平台MVP核心功能：SOS紧急呼叫。包括一键触发SOS、紧急联系人通知、拨打120、位置共享，社区响应等。采用微信服务通知+短信双通道推送，后端实时处理。

## 技术背景
**语言/版本**: Node.js 18.x, Express 4.x, MySQL 8.0, Redis 7.x  
**主要依赖**: Taro 4.x (前端), Express (后端), mysql2, ioredis, 微信服务通知, SMS短信  
**存储**: MySQL (SOS事件记录) + Redis (实时队列)  
**Testing**: Jest + Supertest (后端), Vitest (前端)  
**Target Platform**: 微信小程序 + Web管理后台  
**Project Type**: 移动端小程序 + 后端API服务  
**Performance Goals**: 通知延迟 <3秒, 位置获取成功率 >90%, 社区响应 <15分钟  
**Constraints**: SOS触发后5秒取消窗口，超时后自动发送通知不可撤销；双通道推送（微信+短信）保证送达率  
**Scale/Scope**: MVP阶段支持万级用户

## 跨模块依赖

- 当前实现计划未定义对其他业务模块（001-015）的强依赖（按模块内自包含服务规划）。
- 若后续需要复用其他模块的数据/接口（如统一鉴权、绑定关系、健康档案摘要等），必须在此补充：依赖模块、数据/接口契约、失败语义，并同步更新 tasks.md。

## 指标口径与观测

- **响应时间**：默认以 p95 口径度量；起止点为“网关/服务入口接收请求”到“返回响应”的服务端耗时。
- **成功率**：以业务成功码（如 `code=0`）与 HTTP 状态码综合统计；需明确计入/排除的失败类型。
- **外部依赖**：第三方 API 超时/限流/不可用应单独计数，并在错误语义中区分。
- **审计与隐私**：访问敏感数据的关键行为需记录审计日志；日志字段需脱敏。

## 宪法检查
| 宪法原则 | 检查结果 |
|----------|----------|
| 数据真实性 | ✅ PASS |
| 可落地优先 | ✅ PASS |
| 中文优先 | ✅ PASS |
| 删繁就简 | ✅ PASS |
| 前后一致性 | ✅ PASS |
| 分阶段交付 | ✅ PASS |
| 适老化设计 | ✅ PASS |

## 项目结构
```text
backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/       # SOS紧急救援服务
│   ├── jobs/          # 定时检查
│   └── utils/
└── package.json

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── package.json
```

**Structure Decision**: 采用前后端分离架构（Option 2），后端Node.js+Express，前端Taro跨端小程序。

## Complexity Tracking

> 无宪法违规，无需特别说明
