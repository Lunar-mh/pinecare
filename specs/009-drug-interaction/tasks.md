# 任务清单: 用药交互检查 (009-drug-interaction)

**功能**: 用药交互检查 | **分支**: `009-drug-interaction`
**范围**: 仅后端 (`backend/`) — 前端已完成 | **任务总数**: 41

---

## 可追溯约定
- 本文件内标记 `[USn]` 的任务，对应 `.specify/specs/009-drug-interaction/spec.md` 中的“用户故事 n”
- 未标记 `[USn]` 的任务为基础设施/横切关注点（鉴权、错误处理、迁移、文档、测试等）
- 本模块任务以“后端实现”为范围；spec.md 中的前端体验指标（字号、按钮尺寸、步骤数等）用于验收与设计约束，不在本 tasks 内重复实现


## 阶段 1：初始化

- [X] T001 初始化后端依赖与脚本（express/mysql2/neo4j-driver/axios/dotenv/jsonwebtoken，start/dev/test） in `backend/package.json`
- [X] T002 创建服务入口并初始化 Express（dotenv、json 解析、中间件装配、优雅关闭） in `backend/server.js`
- [X] T003 [P] 创建 MySQL 连接池与 query/transaction 封装 in `backend/src/config/db.js`
- [X] T004 [P] 创建 Neo4j Driver 配置与 session 生命周期管理 in `backend/src/config/neo4j.js`
- [X] T005 [P] 创建环境变量模板，补齐 DB/NEO4J/JWT/PORT 配置项 in `backend/.env.example`

---

## 阶段 2：基础设施

- [X] T006 创建 JWT 鉴权中间件，解析 Bearer Token 并注入 `req.user.userId` in `backend/src/middleware/auth.js`
- [X] T007 [P] 创建全局错误处理中间件，统一输出 `{code,message,data}` 并区分业务/系统异常 in `backend/src/middleware/errorHandler.js`
- [X] T008 [P] 编写迁移脚本创建 `drug_interactions`/`drug_contraindications`/`drug_food_interactions` 三表及索引 in `backend/migrations/001_create_drug_interaction_tables.sql`
- [X] T009 [P] 创建药物名称解析工具，封装清洗、去重、最大30种药限制与风险级别排序工具 in `backend/src/utils/drugDataParser.js`
- [X] T010 创建数据模型骨架，封装三张表的基础 CRUD 与批量写入能力 in `backend/src/models/drugInteraction.js`
- [X] T011 [P] 创建知识图谱服务骨架，封装 Neo4j 通用查询与连接错误处理 in `backend/src/services/knowledgeGraphService.js`
- [X] T012 [P] 创建控制器骨架，预留 `check/history/acknowledge/contraindication/food` 五个处理器 in `backend/src/controllers/drugInteractionController.js`
- [X] T013 [P] 创建路由骨架并预留五个接口路由位，默认接入 auth 中间件 in `backend/src/routes/drugInteraction.js`

---

## 阶段 3：用户故事 1 - 药物相互作用检测

**目标**: 用户提交 `drugList` 后返回全部药物对相互作用，并落库 `drug_interactions`。
**独立验证标准**: `POST /drug-interaction/check` 返回 `{ code: 0, message: "success", data: [...] }`，且记录写入数据库。

- [X] T014 [P] [US1] 实现两药相互作用查询（双向关系匹配，返回 level/mechanism/risk/suggestion） in `backend/src/services/knowledgeGraphService.js`
- [X] T015 [P] [US1] 实现 `drug_interactions` 批量入库与按检测批次查询方法 in `backend/src/models/drugInteraction.js`
- [X] T016 [US1] 实现多药两两组合检测流程，聚合 Neo4j 结果并按 X>D>C>B>A 排序 in `backend/src/services/drugInteractionService.js`
- [X] T017 [US1] 在检测服务中实现结果持久化、最高风险级别汇总与返回结构组装 in `backend/src/services/drugInteractionService.js`
- [X] T018 [US1] 实现 `check` 控制器，校验 `drugList` 参数并统一响应格式 in `backend/src/controllers/drugInteractionController.js`
- [X] T019 [US1] 注册 `POST /drug-interaction/check` 路由并接入 auth 中间件 in `backend/src/routes/drugInteraction.js`
- [X] T020 [US1] 在 003 模块新增用药流程接入自动触发检测（新增药物后调用交互检测服务） in `backend/src/services/medicationService.js`
- [X] T021 [US1] 在 003 模块编辑用药流程接入自动重检（药物变更时重新检测） in `backend/src/services/medicationService.js`

---

## 阶段 4：用户故事 2 - 历史检测记录查询 & 确认风险

**目标**: 用户可按状态筛选历史检测记录，并确认已知风险。
**独立验证标准**: `GET /drug-interaction/history?status=` 返回当前用户记录；`POST /drug-interaction/acknowledge` 将状态更新为 `acknowledged`。

- [X] T022 [US2] 实现按 `user_id + status` 查询历史记录与风险确认状态更新方法 in `backend/src/models/drugInteraction.js`
- [X] T023 [US2] 实现 `getHistory` 与 `acknowledgeRisk` 服务，补充记录归属校验与状态流转校验 in `backend/src/services/drugInteractionService.js`
- [X] T024 [US2] 实现 `history` 与 `acknowledge` 控制器并统一 `{code,message,data}` 响应 in `backend/src/controllers/drugInteractionController.js`
- [X] T025 [US2] 注册 `GET /drug-interaction/history` 与 `POST /drug-interaction/acknowledge` 路由 in `backend/src/routes/drugInteraction.js`

---

## 阶段 5：用户故事 3 - 药物禁忌检测

**目标**: 用户查询某药物与自身疾病档案的禁忌风险。
**独立验证标准**: `GET /drug-interaction/contraindication?drugName=` 返回匹配到的禁忌项并写入 `drug_contraindications`。

- [X] T026 [P] [US3] 实现药物-疾病禁忌知识图谱查询（返回 disease_code/disease_name/severity/description） in `backend/src/services/knowledgeGraphService.js`
- [X] T027 [P] [US3] 实现 `drug_contraindications` 批量写入与按用户药物查询方法 in `backend/src/models/drugInteraction.js`
- [X] T028 [US3] 实现禁忌检测服务：读取用户健康档案疾病并与知识图谱禁忌结果匹配 in `backend/src/services/drugInteractionService.js`
- [X] T029 [US3] 实现 `contraindication` 控制器，校验 `drugName` 并返回统一结构 in `backend/src/controllers/drugInteractionController.js`
- [X] T030 [US3] 注册 `GET /drug-interaction/contraindication` 路由并接入 auth 中间件 in `backend/src/routes/drugInteraction.js`

---

## 阶段 6：用户故事 4 - 药物食物相互作用查询

**目标**: 用户查询药物对应食物相互作用及建议。
**独立验证标准**: `GET /drug-interaction/food?drugName=` 返回匹配到的食物交互列表。

- [X] T031 [P] [US4] 在迁移脚本补充 `drug_food_interactions` 静态初始化数据（高频风险组合） in `backend/migrations/001_create_drug_interaction_tables.sql`
- [X] T032 [P] [US4] 实现按药物名查询食物交互与关键词过滤方法 in `backend/src/models/drugInteraction.js`
- [X] T033 [US4] 实现食物交互查询服务，加入药名标准化与建议字段组装 in `backend/src/services/drugInteractionService.js`
- [X] T034 [US4] 实现 `food` 控制器并统一响应格式 in `backend/src/controllers/drugInteractionController.js`
- [X] T035 [US4] 注册 `GET /drug-interaction/food` 路由 in `backend/src/routes/drugInteraction.js`

---

## 最终阶段：完善

- [X] T036 [P] 挂载 `/drug-interaction` 路由到服务入口并统一 API 前缀 in `backend/server.js`
- [X] T037 [P] 完善 MySQL 连接失败与超时错误映射，输出可读错误消息 in `backend/src/middleware/errorHandler.js`
- [X] T038 [P] 在检测服务加入并发控制、查询超时与降级策略，保障高并发稳定性 in `backend/src/services/drugInteractionService.js`
- [X] T039 [P] 编写契约测试覆盖 5 个 API 端点与统一响应格式校验 in `backend/tests/contract/drugInteraction.contract.test.js`
- [X] T040 [P] 编写集成测试覆盖自动触发检测、历史查询与风险确认完整流程 in `backend/tests/integration/drugInteraction.integration.test.js`
- [X] T041 优化控制器成功/失败 message 文案（适老化、非医学术语优先） in `backend/src/controllers/drugInteractionController.js`
- [X] T042 编写药物相互作用检测性能测试，POST /drug-interaction/check 在100并发下 p95 <1s in `backend/tests/performance/drugInteraction.check.perf.test.js`

---

## 依赖与执行顺序

```
T001 → T002
T001 → T003, T004, T005 (可并行)

T003, T004 → T006, T007, T009, T011 (可并行)
T003 → T008 → T010
T006, T007 → T012, T013 (可并行)

[US1] T009, T010, T011, T012, T013 → T014, T015 (可并行) → T016 → T017 → T018 → T019 → T020 → T021
[US2] T017, T018, T019 → T022 → T023 → T024 → T025
[US3] T011, T010, T025 → T026, T027 (可并行) → T028 → T029 → T030
[US4] T010, T030 → T031, T032 (可并行) → T033 → T034 → T035

[Final] T013, T035 → T036
[Final] T007 → T037
[Final] T017, T028, T033 → T038
[Final] T019, T025, T030, T035 → T039, T040 (可并行)
[Final] T018, T024, T029, T034 → T041
```

---

## 并行执行示例

**阶段 1 并行组（完成 T001 后）**
```
T003 (db.js) || T004 (neo4j.js) || T005 (.env.example)
```

**US1 并行组**
```
T014 (knowledgeGraphService.js) || T015 (drugInteraction.js)
```

**US3 并行组**
```
T026 (knowledgeGraphService.js) || T027 (drugInteraction.js)
```

**US4 并行组**
```
T031 (migration) || T032 (drugInteraction.js)
```

**Final 并行组**
```
T039 (contract test) || T040 (integration test)
```

---

## 任务统计

| 分类 | 任务数 |
|---|---:|
| 阶段 1 初始化 | 5 |
| 阶段 2 基础设施 | 8 |
| US1 药物相互作用检测 | 8 |
| US2 历史查询与风险确认 | 4 |
| US3 药物禁忌检测 | 5 |
| US4 药物食物相互作用查询 | 5 |
| 最终阶段：完善 | 7 |
| **总任务数** | **42** |

| 用户故事 | 任务数 |
|---|---:|
| US1 | 8 |
| US2 | 4 |
| US3 | 5 |
| US4 | 5 |
| **用户故事任务总数** | **22** |
