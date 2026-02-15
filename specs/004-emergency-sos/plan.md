# Implementation Plan: 一键紧急救援

**Branch**: `004-emergency-sos` | **Date**: 2025-07-18 | **Spec**: `.specify/specs/004-emergency-sos/spec.md`

## Summary

银伴平台MVP核心功能：SOS紧急呼叫。包括一键触发SOS、紧急联系人通知、拨打120、位置共享，社区响应等。采用微信服务通知+短信双通道推送，后端实时处理。

## Technical Context

**Language/Version**: Node.js 18.x, Express 4.x, MySQL 8.0, Redis 7.x  
**Primary Dependencies**: Taro 4.x (前端), Express (后端), mysql2, ioredis, 微信服务通知, SMS短信  
**Storage**: MySQL (SOS事件记录) + Redis (实时队列)  
**Target Platform**: 微信小程序 + Web管理后台  
**Performance Goals**: 通知延迟 <3秒, 位置获取成功率 >90%, 社区响应 <15分钟  
**Scale/Scope**: MVP阶段支持万级用户

## Constitution Check

| 宪法原则 | 检查结果 |
|----------|----------|
| 数据真实性 | ✅ PASS |
| 可落地优先 | ✅ PASS |
| 中文优先 | ✅ PASS |
| 删繁就简 | ✅ PASS |
| 前后一致性 | ✅ PASS |
| 分阶段交付 | ✅ PASS |
| 适老化设计 | ✅ PASS |

## Project Structure

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
