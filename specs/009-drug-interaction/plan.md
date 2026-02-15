# Implementation Plan: 用药交互检查

**Branch**: `009-drug-interaction` | **Date**: 2025-07-18 | **Spec**: `specs/009-drug-interaction/`

## Summary

银伴平台用药交互检查模块，基于药物知识图谱实现多药共服冲突检测、药物-疾病禁忌检测、药物-食物相互作用检测。集成003用药提醒模块，在用户添加新药物时自动触发安全检测。前端采用Taro跨端框架，后端采用Node.js + Express + MySQL + Neo4j。

## Technical Context

**Language/Version**: Node.js 18.x, Express 4.x, MySQL 8.0, Neo4j  
**Primary Dependencies**: Taro 4.x (前端), Express (后端), mysql2, neo4j-driver, axios  
**Storage**: MySQL (用药记录) + Neo4j (药物知识图谱)  
**Testing**: Jest + Supertest (后端), Vitest (前端)  
**Target Platform**: 微信小程序 + Web管理后台  
**Project Type**: 移动端小程序 + 后端API服务  
**Performance Goals**: 冲突检测 <1秒, 支持30种药物同时检测  
**Constraints**: 需要药物知识图谱数据支撑  
**Scale/Scope**: MVP阶段支持万级用户

## Constitution Check

| 宪法原则 | 检查结果 | 说明 |
|----------|----------|------|
| 数据真实性 | ✅ PASS | 基于DDInter 2.0等官方药物相互作用数据库 |
| 可落地优先 | ✅ PASS | 采用成熟图数据库方案 |
| 中文优先 | ✅ PASS | 药物信息中文标注 |
| 删繁就简 | ✅ PASS | 自动触发检测，无需用户操作 |
| 前后一致性 | ✅ PASS | 与003用药提醒模块数据互通 |
| 分阶段交付 | ✅ PASS | MVP支持基础冲突检测 |
| 适老化设计 | ✅ PASS | 检测结果语音播报，简化医学术语 |

## Project Structure

### Documentation (this feature)

```text
specs/009-drug-interaction/
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
│   ├── controllers/drugInteractionController.js
│   ├── services/drugInteractionService.js
│   ├── services/knowledgeGraphService.js
│   ├── models/drugInteraction.js
│   ├── routes/drugInteraction.js
│   └── utils/drugDataParser.js
├── tests/
└── package.json

# 前端小程序
frontend/
├── src/pages/drug-check/
├── src/components/drug-result/
└── package.json
```

**Structure Decision**: 采用前后端分离架构，后端Node.js+Express，前端Taro跨端小程序。药物知识图谱使用Neo4j存储。

## Complexity Tracking

> 无宪法违规，无需特别说明
