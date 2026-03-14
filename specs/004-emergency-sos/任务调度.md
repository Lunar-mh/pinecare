# 任务清单: 一键紧急救援 (004-emergency-sos)

**功能**: 一键紧急救援 | **分支**: `004-emergency-sos`  
**范围**: 仅后端 (`backend/`) — 前端已完成 | **任务总数**: 50

---

## 可追溯约定
- 本文件内标记 `[USn]` 的任务，对应 `.specify/specs/004-emergency-sos/spec.md` 中的“用户故事 n”
- 未标记 `[USn]` 的任务为基础设施/横切关注点（鉴权、错误处理、迁移、文档、测试等）
- 本模块任务以“后端实现”为范围；spec.md 中的前端体验指标（字号、按钮尺寸、步骤数等）用于验收与设计约束，不在本 tasks 内重复实现


## 阶段 1: 初始化

- [X] T001 初始化后端依赖与脚本（express/mysql2/ioredis/dotenv/jsonwebtoken/axios，`start`/`dev`/`test`） in `backend/package.json`
- [X] T002 创建后端目录骨架（`src/{config,controllers,middleware,models,routes,services,jobs,utils}`、`migrations`、`tests/{unit,integration,performance}`） in `backend/src/`
- [X] T003 [P] 创建环境变量模板，补齐 DB/REDIS/JWT/WECHAT/SMS/PORT 配置项 in `backend/.env.example`
- [X] T004 创建服务入口，加载 dotenv、启动 HTTP 服务并预留优雅关闭钩子 in `backend/server.js`

---

## 阶段 2: 基础设施

- [X] T005 [P] 创建 MySQL 连接池与 `query` 封装，统一连接错误与超时处理 in `backend/src/config/database.js`
- [X] T006 [P] 创建 Redis 客户端配置，支持重连策略、错误日志与健康检查 in `backend/src/config/redis.js`
- [X] T007 [P] 创建 JWT 鉴权中间件，解析 Bearer Token 并注入 `req.user.userId` in `backend/src/middleware/auth.js`
- [X] T008 [P] 创建全局错误处理中间件，统一输出 `{code, message, data}` 并区分业务/系统异常 in `backend/src/middleware/errorHandler.js`
- [X] T009 创建 SOS 路由骨架并预留 trigger/cancel/history/confirm/resolve 路由位 in `backend/src/routes/sos.js`
- [X] T010 创建路由聚合入口，挂载 `/sos` 路由模块 in `backend/src/routes/index.js`
- [X] T011 创建 Express app 初始化文件，注册 json 解析、路由与 errorHandler in `backend/src/app.js`
- [X] T012 [P] 编写迁移脚本，创建 `sos_events` 与 `sos_notifications` 表、外键与查询索引 in `backend/migrations/004_create_sos_tables.sql`

---

## 阶段 3：用户故事 1 — 触发与取消 SOS (P1, MVP)

**目标**: 实现一键触发 SOS 与 5 秒内取消闭环，满足鉴权与统一响应格式。  
**独立验证标准**:  
1) `POST /sos/trigger` 返回 `{code:0,message:"ok",data:{event_id,event_status:"triggered"}}`;  
2) 5 秒内调用 `POST /sos/cancel` 返回 `{code:0,message:"ok",data:{event_id,event_status:"cancelled"}}`;  
3) 超过 5 秒取消返回业务失败（`code` 为 4xx）且事件状态不变。

- [X] T013 [P] [US1] 创建 SOS 事件模型，封装创建事件、按用户查询事件、状态更新方法 in `backend/src/models/sosEvent.js`
- [X] T014 [P] [US1] 创建 SOS 业务错误码与消息常量（未找到/状态非法/取消超时） in `backend/src/utils/errorCodes.js`
- [X] T015 [P] [US1] 创建 SOS 请求参数校验中间件，校验 `latitude`/`longitude`/`event_id` in `backend/src/middleware/sosValidator.js`
- [X] T016 [US1] 在 SOS 服务实现 `triggerSos` 与 `cancelSos`，含 5 秒取消窗口与归属校验 in `backend/src/services/sosService.js`
- [X] T017 [US1] 实现 SOS 控制器 `trigger`/`cancel` 处理器，统一返回 `{code,message,data}` in `backend/src/controllers/sosController.js`
- [X] T018 [US1] 在 SOS 路由注册 `POST /sos/trigger` 与 `POST /sos/cancel` 并接入 auth 与参数校验 in `backend/src/routes/sos.js`
- [X] T019 [US1] 编写 SOS 服务单元测试，覆盖触发成功、取消成功、取消超时、重复取消 in `backend/tests/unit/sos.service.test.js`
- [X] T020 [US1] 编写触发/取消接口集成测试，覆盖鉴权失败与业务失败响应 in `backend/tests/integration/sos.trigger-cancel.test.js`

---

## 阶段 4：用户故事 2 — 通知紧急联系人（微信+短信）(P2)

**目标**: 触发 SOS 后并行通知所有紧急联系人，通知发送异步化且结果落库。  
**独立验证标准**:  
1) `POST /sos/trigger` 在通知发送过程中仍快速返回（不阻塞等待通道完成）；  
2) 每个联系人产生微信与短信两条通知记录（`pending/sent/failed`）；  
3) 外部通道失败不影响触发接口成功响应。

- [X] T021 [P] [US2] 创建 SOS 通知模型，封装批量写入、状态更新、按事件查询方法 in `backend/src/models/sosNotification.js`
- [X] T022 [P] [US2] 扩展紧急联系人模型，提供按用户查询可通知联系人方法 in `backend/src/models/emergencyContact.js`
- [X] T023 [P] [US2] 实现微信通知客户端，封装模板参数（地址+经纬度）与 axios 调用 in `backend/src/services/wechatNotifyService.js`
- [X] T024 [P] [US2] 实现短信通知客户端，封装阿里云短信请求与错误映射 in `backend/src/services/smsNotifyService.js`
- [X] T025 [P] [US2] 实现 SOS 通知队列服务，封装 Redis 入队/出队与重试计数字段 in `backend/src/services/sosQueueService.js`
- [X] T026 [US2] 实现 SOS 通知编排服务：生成通知任务、批量写入 `pending` 记录并投递队列 in `backend/src/services/sosNotificationService.js`
- [X] T027 [US2] 实现通知 Worker：并行发送微信+短信并回写 `sent/failed` 与 `sent_at` in `backend/src/jobs/sosNotificationWorker.js`
- [X] T028 [US2] 在 `triggerSos` 流程接入异步通知编排，确保主请求不阻塞外部 API in `backend/src/services/sosService.js`
- [X] T029 [US2] 编写通知集成测试，验证并行发送与 `sos_notifications` 落库结果 in `backend/tests/integration/sos.notification.test.js`

---

## 阶段 5：用户故事 3 — SOS 历史查询 (P3)

**目标**: 提供用户维度 SOS 历史列表，支持分页与状态过滤。  
**独立验证标准**:  
1) `GET /sos/history` 返回 `{code:0,message:"ok",data:{list,pagination}}`;  
2) 列表按 `created_at` 倒序；  
3) 仅返回当前用户数据，并包含通知结果摘要。

- [X] T030 [P] [US3] 扩展 SOS 事件模型，支持按用户分页查询与状态过滤 in `backend/src/models/sosEvent.js`
- [X] T031 [P] [US3] 扩展 SOS 通知模型，按事件聚合微信/短信发送结果统计 in `backend/src/models/sosNotification.js`
- [X] T032 [US3] 在 SOS 服务实现 `getHistory`，聚合事件与通知摘要并输出分页元数据 in `backend/src/services/sosService.js`
- [X] T033 [US3] 在 SOS 控制器实现 `history` 处理器，统一响应结构 in `backend/src/controllers/sosController.js`
- [X] T034 [US3] 在 SOS 路由注册 `GET /sos/history` 并接入分页参数校验 in `backend/src/routes/sos.js`
- [X] T035 [US3] 编写历史查询集成测试，覆盖分页、过滤、排序与用户隔离 in `backend/tests/integration/sos.history.test.js`

---

## 阶段 6：用户故事 4 — SOS 状态管理与超时自动解决 (P4)

**目标**: 实现状态流转 `triggered -> confirmed -> resolved` 与超时自动解决任务。  
**独立验证标准**:  
1) `POST /sos/confirm` 仅允许 `triggered -> confirmed`;  
2) `POST /sos/resolve` 仅允许 `confirmed -> resolved`（写入 `resolved_at`）;  
3) 定时任务可自动将超时事件置为 `resolved`。

- [X] T036 [P] [US4] 扩展 SOS 事件模型，实现 confirm/resolve/autoResolve 原子更新与时间字段写入 in `backend/src/models/sosEvent.js`
- [X] T037 [P] [US4] 创建 SOS 状态机工具，校验合法流转规则与非法转换错误 in `backend/src/utils/sosStateMachine.js`
- [X] T038 [US4] 在 SOS 服务实现 `confirmSos`/`resolveSos`，复用状态机与归属校验 in `backend/src/services/sosService.js`
- [X] T039 [US4] 在 SOS 控制器增加 `confirm`/`resolve` 处理器并映射状态流转错误 in `backend/src/controllers/sosController.js`
- [X] T040 [US4] 在 SOS 路由注册 `POST /sos/confirm` 与 `POST /sos/resolve` 并接入鉴权/参数校验 in `backend/src/routes/sos.js`
- [X] T041 [US4] 实现自动解决定时任务，扫描超时 `triggered/confirmed` 事件并批量更新状态 in `backend/src/jobs/sosAutoResolveJob.js`
- [X] T042 [US4] 创建 jobs 聚合入口，注册 auto-resolve 调度并使用 Redis 锁防止重复执行 in `backend/src/jobs/index.js`
- [X] T043 [US4] 编写状态流转与定时任务集成测试，覆盖手动与自动解决场景 in `backend/tests/integration/sos.status-flow.test.js`

---

## 最终阶段：完善

- [X] T044 [P] 创建环境变量校验工具，校验 DB/REDIS/JWT/WECHAT/SMS 必填项并输出缺失清单 in `backend/src/utils/validateEnv.js`
- [X] T045 [P] 创建统一响应工具 `ok()`/`fail()`，强制 `{code,message,data}` 输出格式 in `backend/src/utils/response.js`
- [X] T046 封装通知服务统一接口（wechat/sms 适配器、重试策略、去重键），统一 Worker 调用入口 in `backend/src/services/sosNotificationService.js`
- [X] T047 将 SOS 控制器切换到 response 工具并统一 200/400/401/403/404/409 响应语义 in `backend/src/controllers/sosController.js`
- [X] T048 在启动流程接入 `validateEnv`、jobs 启动与优雅关闭（MySQL/Redis/Workers） in `backend/server.js`
- [X] T049 编写性能测试，确保通知异步化后 `POST /sos/trigger` p95 < 3s in `backend/tests/performance/sos.trigger.latency.test.js`
- [X] T050 补充 SOS 后端运行文档（环境变量、队列、定时任务、失败恢复） in `backend/README.md`

---

## 依赖与执行顺序

```text
T001 → T002 → T003, T004 (可并行)
T002 → T005, T006, T007, T008, T009, T012 (可并行)
T009 → T010
T008, T010 → T011

[US1] T005, T006, T007, T010, T012 → T013, T014, T015 (可并行) → T016 → T017 → T018 → T019, T020 (可并行)

[US2] T016, T018, T012 → T021, T022, T023, T024, T025 (可并行) → T026 → T027 → T028 → T029

[US3] T028, T029 → T030, T031 (可并行) → T032 → T033 → T034 → T035

[US4] T034 → T036, T037 (可并行) → T038 → T039 → T040
[US4] T036, T006 → T041 → T042 → T043

[Final] T027, T042 → T044, T045 (可并行) → T046 → T047
[Final] T044, T045, T005, T006, T042 → T048
[Final] T028 → T049
[Final] T048 → T050
```

---

## 并行执行示例

**阶段 2 并行组（完成 T002 后）**
```text
T005 (database.js) || T006 (redis.js) || T007 (auth.js) || T008 (errorHandler.js) || T012 (migration SQL)
```

**US1 并行组**
```text
T013 (sosEvent.js) || T014 (errorCodes.js) || T015 (sosValidator.js)
```

**US2 并行组**
```text
T021 (sosNotification.js) || T022 (emergencyContact.js) || T023 (wechatNotifyService.js) || T024 (smsNotifyService.js) || T025 (sosQueueService.js)
```

**US3 并行组**
```text
T030 (sosEvent.js) || T031 (sosNotification.js)
```

**US4 并行组**
```text
T036 (sosEvent.js) || T037 (sosStateMachine.js)
```

**Final 并行组**
```text
T044 (validateEnv.js) || T045 (response.js)
```

---

## 任务统计

| 分类 | 任务数 |
|---|---:|
| 阶段 1 初始化 | 4 |
| 阶段 2 基础设施 | 8 |
| US1 (P1, MVP) | 8 |
| US2 (P2) | 9 |
| US3 (P3) | 6 |
| US4 (P4) | 8 |
| 最终阶段 完善 | 7 |
| **总任务数** | **50** |

| 用户故事 | 任务数 |
|---|---:|
| US1 | 8 |
| US2 | 9 |
| US3 | 6 |
| US4 | 8 |
| **用户故事任务总数** | **31** |
