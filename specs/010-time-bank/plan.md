# Implementation Plan: 时间银行

**Branch**: `010-time-bank` | **Date**: 2025-07-18 | **Spec**: `specs/010-time-bank/`

## Summary

银伴平台时间银行模块，激活低龄老人互助养老潜力。服务时长以时间币形式存储，可兑换等值服务或商品。引入数字签名+哈希链存证技术，确保服务记录不可篡改。前端采用Taro跨端框架，后端采用Node.js + Express + MySQL + Redis。

## Technical Context

**Language/Version**: Node.js 18.x, Express 4.x, MySQL 8.0, Redis 7.x  
**Primary Dependencies**: Taro 4.x (前端), Express (后端), mysql2, ioredis, crypto (数字签名)  
**Storage**: MySQL (时间币账户/交易记录) + Redis (缓存)  
**Testing**: Jest + Supertest (后端), Vitest (前端)  
**Target Platform**: 微信小程序 + Web管理后台  
**Project Type**: 移动端小程序 + 后端API服务  
**Performance Goals**: 交易处理 <500ms, 支持高并发  
**Constraints**: 需要可信存证确保数据不可篡改  
**Scale/Scope**: MVP阶段支持百级社区

## Constitution Check

| 宪法原则 | 检查结果 | 说明 |
|----------|----------|------|
| 数据真实性 | ✅ PASS | 哈希链存证确保数据真实可信 |
| 可落地优先 | ✅ PASS | 成熟技术方案实现 |
| 中文优先 | ✅ PASS | 全程中文界面 |
| 删繁就简 | ✅ PASS | 简化兑换流程 |
| 前后一致性 | ✅ PASS | 与志愿服务模块数据互通 |
| 分阶段交付 | ✅ PASS | MVP基础功能，后续扩展 |
| 适老化设计 | ✅ PASS | 语音查询余额，一键发起服务 |

## Project Structure

### Documentation (this feature)

```text
specs/010-time-bank/
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
