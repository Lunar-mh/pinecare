# 任务清单: 跌倒检测基础版 (007-fall-detection)

**功能**: 跌倒检测基础版 | **分支**: `007-fall-detection`
**范围**: 仅后端 (`backend/`) — 前端已完成

---

## 可追溯约定
- 本文件内标记 `[USn]` 的任务，对应 `.specify/specs/007-fall-detection/spec.md` 中的“用户故事 n”
- 未标记 `[USn]` 的任务为基础设施/横切关注点（鉴权、错误处理、迁移、文档、测试等）
- 本模块任务以“后端实现”为范围；spec.md 中的前端体验指标（字号、按钮尺寸、步骤数等）用于验收与设计约束，不在本 tasks 内重复实现


## 阶段 1：初始化

- [ ] T001 初始化后端依赖与脚本（express/mysql2/ioredis/dotenv/jsonwebtoken/axios，start/dev/test 脚本） in `backend/package.json`
- [ ] T002 创建环境变量模板，补齐 DB/REDIS/JWT/通知服务/PORT/倒计时配置项 in `backend/.env.example`
- [ ] T003 [P] 创建 MySQL 连接池与 query 封装，统一超时和连接错误处理 in `backend/src/config/db.js`
- [ ] T004 [P] 创建 Redis 客户端配置，支持重连策略与错误日志 in `backend/src/config/redis.js`
- [ ] T005 创建服务启动入口，加载 dotenv、初始化 Express、注册中间件并实现优雅关闭钩子 in `backend/server.js`

---

## 阶段 2：基础设施

- [ ] T006 [P] 创建 JWT 鉴权中间件，解析 Bearer Token 并注入 `req.user.userId` in `backend/src/middleware/auth.js`
- [ ] T007 [P] 创建全局错误处理中间件，统一输出 `{ code, message, data }` in `backend/src/middleware/errorHandler.js`
- [ ] T008 [P] 编写迁移脚本，创建 `fall_events`、`fall_notifications`、`fall_settings` 三表及必要索引 in `backend/migrations/001_create_fall_tables.sql`
- [ ] T009 创建跌倒模型，封装事件/通知/灵敏度配置的基础读写方法 in `backend/src/models/fall.js`
- [ ] T010 创建跌倒控制器骨架，预留 report/cancel/history/getSettings/updateSettings 处理器 in `backend/src/controllers/fallController.js`
- [ ] T011 创建跌倒路由骨架，挂载鉴权并预留 5 个 API 路由位 in `backend/src/routes/fall.js`
- [ ] T012 更新服务入口，挂载 `/fall` 路由并确保 errorHandler 顺序正确 in `backend/server.js`

---

## 阶段 3：用户故事 1 - 跌倒事件上报与检测

- [ ] T013 [P] [US1] 实现跌倒判定算法 `detectFall(sensorData, sensitivity)`，支持高/中/低灵敏度阈值 in `backend/src/services/fallService.js`
- [ ] T014 [P] [US1] 扩展模型方法，支持 `createDetectingEvent`、`findEventByIdAndUser`、`markCancelled`、`markFalseAlarm` in `backend/src/models/fall.js`
- [ ] T015 [US1] 实现 `reportFall` 流程：接收传感器数据、判定跌倒、创建 `detecting` 事件并写入 15 秒 Redis 倒计时 key in `backend/src/services/fallService.js`
- [ ] T016 [US1] 实现 `cancelFall` 流程：校验事件归属与状态、更新 `cancelled`、删除倒计时 key in `backend/src/services/fallService.js`
- [ ] T017 [US1] 实现 report/cancel 控制器，统一返回 `{ code: 0, message: "success", data }` in `backend/src/controllers/fallController.js`
- [ ] T018 [US1] 在路由中注册 `POST /fall/report` 与 `POST /fall/cancel` 并接入鉴权 in `backend/src/routes/fall.js`
- [ ] T019 [US1] 完成非跌倒分支处理，按策略返回 no-fall 结果并记录 `false_alarm` 事件 in `backend/src/services/fallService.js`
- [ ] T020 [US1] 编写上报与 15 秒内取消流程集成测试（覆盖 detecting->cancelled） in `backend/tests/integration/fall-report-cancel.test.js`

---

## 阶段 4：用户故事 2 - 自动通知家属

- [ ] T021 [P] [US2] 扩展模型方法，查询绑定家属/社区联系人并批量写入通知记录 in `backend/src/models/fall.js`
- [ ] T022 [P] [US2] 实现通知服务，封装微信/SMS 推送（axios 调用、超时控制、失败重试） in `backend/src/services/notificationService.js`
- [ ] T023 [US2] 实现倒计时到期处理 `processPendingFall`：未取消则更新事件为 `confirmed` 并触发通知 in `backend/src/services/fallService.js`
- [ ] T024 [US2] 实现 Redis 倒计时 worker，消费到期事件并调用 `processPendingFall` in `backend/src/services/fallService.js`
- [ ] T025 [US2] 在服务启动与关闭流程中接入倒计时 worker 生命周期管理 in `backend/server.js`
- [ ] T026 [US2] 编写超时自动通知集成测试（覆盖 detecting->confirmed 与通知记录落库） in `backend/tests/integration/fall-auto-notify.test.js`

---

## 阶段 5：用户故事 3 - 查看跌倒历史

- [ ] T027 [P] [US3] 实现历史查询模型方法，支持分页、状态过滤、时间倒序 in `backend/src/models/fall.js`
- [ ] T028 [US3] 实现 `getFallHistory` 服务方法，封装分页参数解析与结果映射 in `backend/src/services/fallService.js`
- [ ] T029 [US3] 实现 `GET /fall/history` 控制器，返回标准历史列表结构 in `backend/src/controllers/fallController.js`
- [ ] T030 [US3] 在路由中注册 `GET /fall/history` 并接入鉴权 in `backend/src/routes/fall.js`
- [ ] T031 [US3] 编写历史查询集成测试（分页、状态筛选、鉴权） in `backend/tests/integration/fall-history.test.js`

---

## 阶段 6：用户故事 4 - 灵敏度设置

- [ ] T032 [P] [US4] 实现灵敏度配置模型方法，支持 `getSensitivitySetting` 与 `upsertSensitivitySetting` in `backend/src/models/fall.js`
- [ ] T033 [US4] 实现设置服务 `getFallSettings`/`updateFallSettings`，仅允许 `high|medium|low` 并同步 Redis 缓存 in `backend/src/services/fallService.js`
- [ ] T034 [US4] 实现 `GET /fall/settings` 与 `PUT /fall/settings` 控制器 in `backend/src/controllers/fallController.js`
- [ ] T035 [US4] 在路由中注册 `GET /fall/settings` 与 `PUT /fall/settings` 并接入鉴权 in `backend/src/routes/fall.js`
- [ ] T036 [US4] 编写灵敏度设置集成测试（读取、更新、非法值校验） in `backend/tests/integration/fall-settings.test.js`

---

## 最终阶段：完善

- [ ] T037 [P] 创建统一响应工具 `ok()/fail()`，固化 `{ code, message, data }` 输出 in `backend/src/utils/response.js`
- [ ] T038 将跌倒控制器全面切换到统一响应工具并规范业务错误映射 in `backend/src/controllers/fallController.js`
- [ ] T039 [P] 创建写接口限流中间件（report/cancel 按用户+设备限频） in `backend/src/middleware/rateLimiter.js`
- [ ] T040 在跌倒路由为写接口接入限流与参数校验顺序控制 in `backend/src/routes/fall.js`
- [ ] T041 编写 API 契约测试，覆盖 5 个端点的响应结构、状态码与鉴权约束 in `backend/tests/contract/fall-api.contract.test.js`
- [ ] T042 完善启动自检与优雅关闭：启动时 DB/Redis ping，退出时关闭 worker、MySQL、Redis 连接 in `backend/server.js`
- [ ] T043 编写跌倒上报接口性能测试，POST /fall/report 在100并发下 p95 <500ms in `backend/tests/performance/fall.report.perf.test.js`

---

## Dependencies 说明

- 先完成 初始化 + 基础设施，确保连接层、鉴权层、错误处理层和迁移脚本稳定，再进入用户故事实现。
- US1 是核心前置，US2 依赖 US1 的 detecting/cancelled 状态流转；US3 与 US4 可在 US1 稳定后并行推进。
- 最终阶段 聚焦统一响应、限流和契约测试，作为发布前收敛阶段。

```text
T001 → T002, T003, T004 (可并行)
T003, T004 → T005
T005 → T006, T007, T008 (可并行)
T006, T007, T008 → T009, T010, T011 (可并行) → T012

[US1] T009, T010, T011, T012 → T013, T014 (可并行) → T015, T019 (可并行) → T016 → T017 → T018 → T020
[US2] T014, T018 → T021
[US2] T018 → T022
[US2] T021, T022 → T023 → T024 → T025 → T026
[US3] T009, T018 → T027 → T028 → T029 → T030 → T031
[US4] T009 → T032 → T033 → T034 → T035 → T036

[Final] T018, T030, T035 → T037, T039 (可并行)
[Final] T037 → T038
[Final] T039 → T040
[Final] T038, T040, T031, T036 → T041
[Final] T025, T005 → T042
```

---

## 并行执行示例

**阶段 1 并行组（完成 T001 后）**
```text
T003 (db.js) || T004 (redis.js)
```

**阶段 2 并行组（完成 T005 后）**
```text
T006 (auth.js) || T007 (errorHandler.js) || T008 (migration SQL)
```

**US1 并行组（完成 T012 后）**
```text
T013 (fallService detection) || T014 (fall model event methods)
```

**US2 并行组（完成 T018 后）**
```text
T021 (fall model notification methods) || T022 (notificationService push)
```

**Final 并行组**
```text
T037 (response.js) || T039 (rateLimiter.js)
```

---

## 统计

- 阶段数: 7（阶段 1-6 + 最终阶段）
- 总任务数: 43
