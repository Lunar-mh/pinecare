# 任务清单: 家属端基础功能 (005-family-app)

**功能**: 家属端基础功能 | **分支**: `005-family-app`
**范围**: 仅后端 (`backend/`) — 前端已完成 | **任务总数**: 31

---

## 可追溯约定
- 本文件内标记 `[USn]` 的任务，对应 `.specify/specs/005-family-app/spec.md` 中的“用户故事 n”
- 未标记 `[USn]` 的任务为基础设施/横切关注点（鉴权、错误处理、迁移、文档、测试等）
- 本模块任务以“后端实现”为范围；spec.md 中的前端体验指标（字号、按钮尺寸、步骤数等）用于验收与设计约束，不在本 tasks 内重复实现


## 依赖（前置模块）

- 模块 `001-user-auth` 已交付并可用：提供 JWT 登录鉴权能力与 `family_bindings` 表（含 `elder_id/family_id/status`）。
- 模块 `002-health-archive` 已交付并可用：提供老人健康数据来源（用于 `/family/health/:elderId` 最新快照查询）。
- 若 001/002 未部署，阶段 3-5 的接口联调与验收不可执行。

---

## 阶段 1：初始化

- [X] T001 初始化后端依赖与脚本（express/mysql2/ioredis/dotenv/jsonwebtoken/swagger-jsdoc/swagger-ui-express，start/dev 脚本） in `backend/package.json`
- [X] T002 [P] 创建 MySQL 连接配置，导出连接池与 `query` 方法 in `backend/src/config/db.js`
- [X] T003 [P] 创建 Redis 连接配置，导出客户端与连接异常处理 in `backend/src/config/redis.js`
- [X] T004 创建服务启动入口，加载 dotenv、初始化 Express、挂载 family 路由并注册错误中间件 in `backend/server.js`

---

## 阶段 2：基础设施

- [X] T005 [P] 实现 JWT Bearer 鉴权中间件，校验 token 并注入 `req.user.userId` in `backend/src/middleware/auth.js`
- [X] T006 [P] 实现统一错误处理中间件，标准化输出 `{ code, message, data }` in `backend/src/middleware/errorHandler.js`
- [X] T007 [P] 编写通知设置迁移脚本，创建 `notification_settings` 表、`user_id` 唯一索引与时间戳字段 in `backend/migrations/001_create_notification_settings.sql`
- [X] T008 [P] 创建 Family 数据访问基础方法（绑定关系查询、权限校验、通知设置查询入口） in `backend/src/models/family.js`
- [X] T009 创建 Family 服务层骨架，定义 bindings/health/settings 三类用例入口 in `backend/src/services/familyService.js`
- [X] T010 创建 Family 控制器骨架，封装 `success` 响应函数并预留 4 个处理器 in `backend/src/controllers/familyController.js`
- [X] T011 创建 Family 路由骨架，接入 auth 中间件并预留 4 个 API 路由位 in `backend/src/routes/family.js`

---

## 阶段 3：用户故事 1 - 查看绑定家庭成员列表

- [X] T012 [US1] 实现绑定列表查询方法 `listBindingsByFamilyId(familyId)`，仅返回 `status='active'` 记录 in `backend/src/models/family.js`
- [X] T013 [US1] 实现服务方法 `getFamilyBindings(userId)`，组装家属绑定老人列表数据 in `backend/src/services/familyService.js`
- [X] T014 [US1] 实现控制器 `getBindings`，返回 `{ code: 0, message: "success", data: [...] }` in `backend/src/controllers/familyController.js`
- [X] T015 [US1] 注册 `GET /family/bindings` 路由并绑定 `getBindings` 处理器 in `backend/src/routes/family.js`

---

## 阶段 4：用户故事 2 - 查看老人健康数据

- [X] T016 [US2] 实现权限校验方法 `checkFamilyBinding(familyId, elderId)`，拒绝未绑定访问 in `backend/src/models/family.js`
- [X] T017 [US2] 实现健康快照查询方法 `getLatestHealthSnapshot(elderId)`，读取 002 模块健康数据源 in `backend/src/models/family.js`
- [X] T018 [US2] 实现服务方法 `getElderHealth(userId, elderId)`，先鉴权再返回最新健康数据 in `backend/src/services/familyService.js`
- [X] T019 [US2] 实现控制器 `getHealthByElderId`，处理 403/404 业务错误并统一响应结构 in `backend/src/controllers/familyController.js`
- [X] T020 [US2] 注册 `GET /family/health/:elderId` 路由并校验 `elderId` 参数合法性 in `backend/src/routes/family.js`

---

## 阶段 5：用户故事 3 - 通知设置管理

- [X] T021 [US3] 实现通知设置查询方法 `findNotificationSettingsByUserId(userId)` in `backend/src/models/family.js`
- [X] T022 [US3] 实现通知设置 upsert 方法 `upsertNotificationSettings(userId, payload)` in `backend/src/models/family.js`
- [X] T023 [US3] 实现服务方法 `getNotificationSettings(userId)`，无记录时返回默认开关值 in `backend/src/services/familyService.js`
- [X] T024 [US3] 实现服务方法 `updateNotificationSettings(userId, payload)`，执行字段白名单与布尔归一化 in `backend/src/services/familyService.js`
- [X] T025 [US3] 实现控制器 `getSettings` 与 `updateSettings`，统一返回 `message: "success"` in `backend/src/controllers/familyController.js`
- [X] T026 [US3] 注册 `GET /family/settings` 与 `PUT /family/settings` 路由 in `backend/src/routes/family.js`

---

## 最终阶段：完善

- [X] T027 [P] 编写 Family 模块 Swagger 文档，覆盖 4 个接口、JWT 鉴权与统一响应 Schema in `backend/src/docs/familySwagger.js`
- [X] T028 在服务入口挂载 Swagger UI（`/api-docs`）并注册 Family OpenAPI 定义 in `backend/server.js`
- [X] T029 [P] 完善全局错误处理中间件，补齐 401/403/404/422/500 错误映射与兜底消息 in `backend/src/middleware/errorHandler.js`
- [X] T030 收敛控制器异常流到 `next(err)`，确保所有成功响应均为 `{ code: 0, message: "success", data }` in `backend/src/controllers/familyController.js`
- [X] T031 编写家属健康快照查询性能测试，GET /family/health/:elderId 在200并发下 p95 <200ms in `backend/tests/performance/family.health.perf.test.js`

---

## 依赖与执行顺序

```text
前置模块依赖:
001-user-auth (JWT + family_bindings) -> 005-family-app
002-health-archive (health snapshot source) -> 005-family-app

阶段 1:
T001 -> T002, T003 (可并行) -> T004

阶段 2:
T004 -> T005, T006, T007, T008 (可并行) -> T009 -> T010 -> T011

US1:
T011, T008 -> T012 -> T013 -> T014 -> T015

US2:
T015 -> T016 -> T017 -> T018 -> T019 -> T020

US3:
T020 -> T021 -> T022 -> T023 -> T024 -> T025 -> T026

Final:
T026 -> T027, T029 (可并行) -> T028, T030 (可并行)
```

---

## 并行执行示例

**阶段 1 并行组（完成 T001 后）**
```text
T002 (backend/src/config/db.js) || T003 (backend/src/config/redis.js)
```

**阶段 2 并行组（完成 T004 后）**
```text
T005 (backend/src/middleware/auth.js) || T006 (backend/src/middleware/errorHandler.js) || T007 (backend/migrations/001_create_notification_settings.sql) || T008 (backend/src/models/family.js)
```

**Final 并行组（完成 T026 后）**
```text
T027 (backend/src/docs/familySwagger.js) || T029 (backend/src/middleware/errorHandler.js)
```

---

## 任务统计

- 阶段数: 6
- 任务总数: 31
- 阶段 1 初始化: 4
- 阶段 2 基础设施: 7
- 阶段 3 US1: 4
- 阶段 4 US2: 5
- 阶段 5 US3: 6
- 最终阶段：完善: 5
