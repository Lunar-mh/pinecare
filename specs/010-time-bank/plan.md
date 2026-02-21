# 实施计划: 时间银行

**分支**: `010-time-bank` | **日期**: 2025-07-18 | **规格**: `specs/010-time-bank/`

## 概述
银伴平台时间银行模块，激活低龄老人互助养老潜力。服务时长以时间币形式存储，可兑换等值服务或商品。引入数字签名+哈希链存证技术，确保服务记录不可篡改。前端采用Taro跨端框架，后端采用Node.js + Express + MySQL + Redis。

## 技术背景
**语言/版本**: Node.js 18.x, Express 4.x, MySQL 8.0, Redis 7.x  
**主要依赖**: Taro 4.x (前端), Express (后端), mysql2, ioredis, crypto (数字签名)  
**存储**: MySQL (时间币账户/交易记录) + Redis (缓存)  
**Testing**: Jest + Supertest (后端), Vitest (前端)  
**Target Platform**: 微信小程序 + Web管理后台  
**Project Type**: 移动端小程序 + 后端API服务  
**Performance Goals**: 交易处理 <500ms, 支持高并发  
**Constraints**: 需要可信存证确保数据不可篡改  
**Scale/Scope**: MVP阶段支持百级社区

## 跨模块依赖

- 当前实现计划未定义对其他业务模块（001-015）的强依赖（按模块内自包含服务规划）。
- 若后续需要复用其他模块的数据/接口（如统一鉴权、绑定关系、健康档案摘要等），必须在此补充：依赖模块、数据/接口契约、失败语义，并同步更新 tasks.md。

## 指标口径与观测

- **响应时间**：默认以 p95 口径度量；起止点为“网关/服务入口接收请求”到“返回响应”的服务端耗时。
- **成功率**：以业务成功码（如 `code=0`）与 HTTP 状态码综合统计；需明确计入/排除的失败类型。
- **外部依赖**：第三方 API 超时/限流/不可用应单独计数，并在错误语义中区分。
- **审计与隐私**：访问敏感数据的关键行为需记录审计日志；日志字段需脱敏。

## 宪法检查
| 宪法原则 | 检查结果 | 说明 |
|----------|----------|------|
| 数据真实性 | ✅ PASS | 哈希链存证确保数据真实可信 |
| 可落地优先 | ✅ PASS | 成熟技术方案实现 |
| 中文优先 | ✅ PASS | 全程中文界面 |
| 删繁就简 | ✅ PASS | 简化兑换流程 |
| 前后一致性 | ✅ PASS | 与志愿服务模块数据互通 |
| 分阶段交付 | ✅ PASS | MVP基础功能，后续扩展 |
| 适老化设计 | ✅ PASS | 语音查询余额，一键发起服务 |

## 项目结构
### Documentation (this feature)

```text
specs/010-time-bank/
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
│   ├── controllers/timeBankController.js
│   ├── services/timeBankService.js
│   ├── services/credentialService.js
│   ├── models/timeBank.js
│   ├── routes/timeBank.js
│   └── utils/hashChain.js
├── tests/
└── package.json

# 前端小程序
frontend/
├── src/pages/time-bank/
├── src/components/service-card/
└── package.json
```

**Structure Decision**: 采用前后端分离架构，后端Node.js+Express，前端Taro跨端小程序。引入哈希链存证确保服务记录可信。

## Complexity Tracking

> 无宪法违规，无需特别说明
