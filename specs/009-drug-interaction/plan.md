# 实施计划: 用药交互检查

**分支**: `009-drug-interaction` | **日期**: 2025-07-18 | **规格**: `specs/009-drug-interaction/`

## 概述
银伴平台用药交互检查模块，基于DDInter 2.0药物相互作用数据库实现多药共服冲突检测、药物-疾病禁忌检测、药物-食物相互作用检测。集成003用药提醒模块，在用户添加新药物时自动触发安全检测。前端采用Taro跨端框架，后端采用Node.js + Express + MySQL + Redis。

## 技术背景
**语言/版本**: Node.js 18.x, Express 4.x, MySQL 8.0, Redis 7.x  
**主要依赖**: Taro 4.x (前端), Express (后端), mysql2, ioredis, axios  
**存储**: MySQL (用药记录 + 药物相互作用邻接表) + Redis (热点查询缓存)  
**Testing**: Jest + Supertest (后端), Vitest (前端)  
**Target Platform**: 微信小程序 + Web管理后台  
**Project Type**: 移动端小程序 + 后端API服务  
**Performance Goals**: 冲突检测 <1秒, 支持30种药物同时检测（C(30,2)=435对批量查询）  
**Constraints**: 使用DDInter 2.0开源数据库（约5万条相互作用记录），无多跳图遍历需求  
**Scale/Scope**: MVP阶段支持万级用户

## 宪法检查
| 宪法原则 | 检查结果 | 说明 |
|----------|----------|------|
| 数据真实性 | ✅ PASS | 基于DDInter 2.0等官方药物相互作用数据库 |
| 可落地优先 | ✅ PASS | 采用成熟图数据库方案 |
| 中文优先 | ✅ PASS | 药物信息中文标注 |
| 删繁就简 | ✅ PASS | 自动触发检测，无需用户操作 |
| 前后一致性 | ✅ PASS | 与003用药提醒模块数据互通 |
| 分阶段交付 | ✅ PASS | MVP支持基础冲突检测 |
| 适老化设计 | ✅ PASS | 检测结果语音播报，简化医学术语 |

## 项目结构
### Documentation (this feature)

```text
specs/009-drug-interaction/
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

**Structure Decision**: 采用前后端分离架构（Option 2），后端Node.js+Express，前端Taro跨端小程序。药物相互作用数据使用MySQL邻接表存储（药物对无向边，drug_a_id < drug_b_id约束保证唯一性），Redis缓存热点药物组合查询结果（TTL 24h）。

## 跨模块依赖
| 依赖模块 | 依赖类型 | 说明 |
|----------|----------|------|
| 001-user-auth | 强依赖 | JWT鉴权，识别当前用户 |
| 003-medication-reminder | 读依赖 | 用户添加新药物时调用本模块触发冲突检测 |

## 指标口径与观测

- **响应时间**：默认以 p95 口径度量；起止点为“网关/服务入口接收请求”到“返回响应”的服务端耗时。
- **成功率**：以业务成功码（如 `code=0`）与 HTTP 状态码综合统计；需明确计入/排除的失败类型。
- **外部依赖**：第三方 API 超时/限流/不可用应单独计数，并在错误语义中区分。
- **审计与隐私**：访问敏感数据的关键行为需记录审计日志；日志字段需脱敏。

## Complexity Tracking

> **C2 宪法违规说明**：原方案使用 Neo4j 图数据库（宪法禁用技术栈之外），经 Oracle 评估后已替换。

| 决策 | 原方案 | 替换方案 | 替换理由 |
|------|--------|----------|----------|
| 药物相互作用存储 | Neo4j 图数据库 | MySQL 邻接表 | DDInter 2.0 所有查询均为单跳边查询（两药/药物-疾病），无多跳遍历需求；5万条记录在MySQL复合索引下 <100ms；符合宪法技术栈 |
