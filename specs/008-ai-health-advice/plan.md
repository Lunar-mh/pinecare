# Implementation Plan: AI健康顾问

**Branch**: `008-ai-health-advice` | **Date**: 2025-07-18 | **Spec**: `specs/008-ai-health-advice/`

## Summary

银伴平台AI健康顾问模块，基于用户健康档案数据，通过AI大模型提供个性化的健康咨询、症状分析、健康建议服务。支持语音交互，为老人提供零门槛的健康咨询服务。前端采用Taro跨端框架，后端采用Node.js + Express + MySQL + Redis + AI大模型。

## Technical Context

**Language/Version**: Node.js 18.x, Express 4.x, MySQL 8.0, Redis 7.x  
**Primary Dependencies**: Taro 4.x (前端), Express (后端), mysql2, ioredis, 阿里云通义千问/百度文心一言 (AI大模型API)  
**Storage**: MySQL (咨询记录) + Redis (会话缓存)  
**Testing**: Jest + Supertest (后端), Vitest (前端)  
**Target Platform**: 微信小程序 + Web管理后台  
**Project Type**: 移动端小程序 + 后端API服务  
**Performance Goals**: AI响应 <5秒, 语音合成 <1秒  
**Constraints**: AI API调用频率限制, 需要内容安全审核  
**Scale/Scope**: MVP阶段支持千级日咨询量

## Constitution Check

| 宪法原则 | 检查结果 | 说明 |
|----------|----------|------|
| 数据真实性 | ✅ PASS | 基于用户真实健康数据，AI建议标注仅供参考 |
| 可落地优先 | ✅ PASS | 调用成熟AI API，快速落地 |
| 中文优先 | ✅ PASS | 全程中文交互，支持方言识别 |
| 删繁就简 | ✅ PASS | 语音优先，简化操作流程 |
| 前后一致性 | ✅ PASS | 与健康档案模块数据互通 |
| 分阶段交付 | ✅ PASS | MVP基础咨询，后续扩展专业领域 |
| 适老化设计 | ✅ PASS | 语音交互为主，大字界面 |

## Project Structure

### Documentation (this feature)

```text
specs/008-ai-health-advice/
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
│   ├── controllers/aiConsultController.js
│   ├── services/aiService.js
│   ├── services/healthContextService.js
│   ├── services/contentSafetyService.js
│   ├── models/consultRecord.js
│   ├── routes/aiConsult.js
│   └── utils/promptTemplate.js
├── tests/
└── package.json

# 前端小程序
frontend/
├── src/pages/ai-consult/
├── src/components/voice-input/
├── src/services/aiConsultService.js
└── package.json
```

**Structure Decision**: 采用前后端分离架构，后端Node.js+Express，前端Taro跨端小程序。AI能力通过调用第三方大模型API实现。

## Complexity Tracking

> 无宪法违规，无需特别说明
