# 实施计划: 全维健康档案基础版

**分支**: `002-health-archive` | **日期**: 2025-07-18 | **规格**: `.specify/specs/002-health-archive/spec.md`

**说明**: 本文件由 `/speckit.plan` 命令生成。执行流程见 `.specify/templates/commands/plan.md`。

## 概述
银伴平台MVP核心功能：健康数据汇聚、手环同步、基本展示。包括智能手环数据同步、健康数据大字展示、趋势查看、家属端查看、手动录入、睡眠数据等。前端采用Taro跨端框架，后端采用Node.js + Express + MySQL + Redis。

## 技术背景
**语言/版本**: Node.js 18.x, Express 4.x, MySQL 8.0, Redis 7.x  
**主要依赖**: Taro 4.x (前端), Express (后端), mysql2, ioredis, echarts (图表), 微信小程序蓝牙API  
**存储**: MySQL (健康数据) + Redis (缓存/实时数据)  
**Testing**: Jest + Supertest (后端), Vitest (前端)  
**Target Platform**: 微信小程序 + Web管理后台  
**Project Type**: 移动端小程序 + 后端API服务  
**Performance Goals**: 首屏加载 <3秒, 数据同步成功率 >98%, 家属端延迟 <5秒  
**Constraints**: 蓝牙需用户授权, 手环采用"批量采集+同步"模式  
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
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 宪法原则 | 检查结果 | 说明 |
|----------|----------|------|
| 数据真实性 | ✅ PASS | 采用通用医学标准判断异常，健康数据真实可靠 |
| 可落地优先 | ✅ PASS | 微信蓝牙API有成熟方案，手环同步采用批量模式 |
| 中文优先 | ✅ PASS | 全程中文设计 |
| 删繁就简 | ✅ PASS | MVP技术栈精简，不过度设计 |
| 前后一致性 | ✅ PASS | 文档数据一致 |
| 分阶段交付 | ✅ PASS | MVP核心功能，后续迭代扩展 |
| 适老化设计 | ✅ PASS | 大字展示(36sp+)，简单交互 |

## 项目结构
### Documentation (this feature)

```text
specs/002-health-archive/
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
│   ├── config/         # 配置文件
│   ├── controllers/    # 控制器
│   ├── middleware/    # 中间件
│   ├── models/         # 数据模型
│   ├── routes/         # 路由
│   ├── services/       # 业务逻辑
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

**Structure Decision**: 采用前后端分离架构，后端Node.js+Express，前端Taro跨端小程序。数据库MySQL + Redis缓存。API接口遵循RESTful规范。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
