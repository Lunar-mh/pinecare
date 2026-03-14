# 任务清单: 全维健康档案基础版 (002-health-archive)

**功能**: 全维健康档案 | **分支**: `002-health-archive`
**范围**: 仅后端 (`backend/`) — 前端已完成 | **任务总数**: 60

---

## 可追溯约定
- 本文件内标记 `[USn]` 的任务，对应 `.specify/specs/002-health-archive/spec.md` 中的“用户故事 n”
- 未标记 `[USn]` 的任务为基础设施/横切关注点（鉴权、错误处理、迁移、文档、测试等）
- 本模块任务以“后端实现”为范围；spec.md 中的前端体验指标（字号、按钮尺寸、步骤数等）用于验收与设计约束，不在本 tasks 内重复实现


## 阶段 1（初始化）

**目标**：完成后端项目初始化、目录就绪、环境模板和启动入口。

- [X] T001 初始化后端 Node.js 项目并配置运行/测试脚本 in `backend/package.json`
- [X] T002 [P] 创建配置层目录占位并固定结构 in `backend/src/config/.gitkeep`
- [X] T003 [P] 创建控制器层目录占位并固定结构 in `backend/src/controllers/.gitkeep`
- [X] T004 [P] 创建中间件层目录占位并固定结构 in `backend/src/middleware/.gitkeep`
- [X] T005 [P] 创建模型层目录占位并固定结构 in `backend/src/models/.gitkeep`
- [X] T006 [P] 创建路由层目录占位并固定结构 in `backend/src/routes/.gitkeep`
- [X] T007 [P] 创建服务层目录占位并固定结构 in `backend/src/services/.gitkeep`
- [X] T008 [P] 创建工具层目录占位并固定结构 in `backend/src/utils/.gitkeep`
- [X] T009 [P] 创建测试目录占位并固定结构 in `backend/tests/.gitkeep`
- [X] T010 编写环境变量模板（MySQL/Redis/JWT/PORT） in `backend/.env.example`
- [X] T011 创建服务启动入口并加载应用实例 in `backend/server.js`

## 阶段 2（基础设施）

**目标**：完成数据库、缓存、鉴权、错误处理、应用装配与基础迁移。

- [X] T012 [P] 实现 MySQL 连接池与查询封装 in `backend/src/config/database.js`
- [X] T013 [P] 实现 Redis 客户端连接与重连策略 in `backend/src/config/redis.js`
- [X] T014 [P] 实现 JWT Bearer 鉴权并注入 `req.user.userId` in `backend/src/middleware/auth.js`
- [X] T015 [P] 实现全局错误处理中间件 in `backend/src/middleware/errorHandler.js`
- [X] T016 组装 Express 应用（JSON 解析、路由、错误处理） in `backend/src/app.js`
- [X] T017 创建 API 路由总入口并挂载模块路由 in `backend/src/routes/index.js`
- [X] T018 创建健康档案主表迁移脚本 `health_archives` in `backend/migrations/002_create_health_archives.sql`
- [X] T019 创建设备绑定表迁移脚本 `device_bindings` in `backend/migrations/003_create_device_bindings.sql`
- [X] T020 创建健康记录表迁移脚本 `health_records`（含 FK）in `backend/migrations/004_create_health_records.sql`
- [X] T021 创建健康查询与设备管理索引迁移脚本 in `backend/migrations/005_add_health_archive_indexes.sql`

## 阶段 3（US1: 查看今日健康数据与趋势）

**目标**：交付 `GET /health/today` 与 `GET /health/trend`（本人查询）。

**独立验证标准**
- 已登录用户调用 `GET /health/today` 返回 `{code,message,data}` 且包含今日各指标数据。
- `GET /health/trend?metric_type=heart_rate&period=7d|30d` 返回对应周期趋势数据。
- 非法 `metric_type` 或 `period` 返回业务错误码与可读错误信息。

- [X] T022 [US1] 实现今日数据与趋势数据查询模型 in `backend/src/models/healthRecordModel.js`
- [X] T023 [US1] 实现健康查询服务（today/trend 业务编排） in `backend/src/services/healthArchiveService.js`
- [X] T024 [US1] 实现健康查询控制器（today/trend 入参与响应） in `backend/src/controllers/healthController.js`
- [X] T025 [US1] 创建健康路由并注册 `GET /today`、`GET /trend` in `backend/src/routes/health.js`
- [X] T026 [US1] 在总路由挂载 `/health` 并接入 auth in `backend/src/routes/index.js`
- [X] T027 [US1] 编写今日与趋势接口集成测试（含空数据场景） in `backend/tests/health.query.test.js`

## 阶段 4（US2: 手环同步与设备管理）

**目标**：交付 `POST /health/sync`、`POST /device/bind`、`POST /device/unbind`、`GET /device/list`、`POST /device/set-primary`。

**独立验证标准**
- 设备绑定成功后可在 `GET /device/list` 查询到，解绑后状态变为 `unbound`。
- 设置主设备后同一用户仅有一个 `is_primary=1`。
- `POST /health/sync` 成功写入 `health_records`（`source=device`、`synced_at` 有值）并刷新设备 `last_sync_at`。

- [X] T028 [US2] 实现设备绑定模型（绑定/解绑/列表/主设备切换） in `backend/src/models/deviceBindingModel.js`
- [X] T029 [US2] 扩展健康记录模型支持批量设备数据写入 in `backend/src/models/healthRecordModel.js`
- [X] T030 [US2] 实现设备管理服务（主设备唯一与状态流转） in `backend/src/services/deviceService.js`
- [X] T031 [US2] 实现手环同步服务（设备校验、批量落库、同步时间更新） in `backend/src/services/healthSyncService.js`
- [X] T032 [US2] 实现设备控制器（bind/unbind/list/set-primary） in `backend/src/controllers/deviceController.js`
- [X] T033 [US2] 扩展健康控制器新增 `POST /health/sync` in `backend/src/controllers/healthController.js`
- [X] T034 [US2] 创建设备路由并注册设备管理接口 in `backend/src/routes/device.js`
- [X] T035 [US2] 更新健康路由注册 `POST /sync` in `backend/src/routes/health.js`
- [X] T036 [US2] 在总路由挂载 `/device` 并统一鉴权 in `backend/src/routes/index.js`
- [X] T037 [US2] 编写设备管理与同步接口集成测试 in `backend/tests/device.sync.test.js`

## 阶段 5（US3: 手动录入健康数据）

**目标**：交付 `POST /health/manual`，支持手动补录关键健康指标。

**独立验证标准**
- `POST /health/manual` 对 `metric_type`、`value` 必填校验生效。
- 写入成功后记录 `source=manual` 且 `measured_at` 正常落库。
- 手动录入后可通过 `GET /health/today` 查询到对应数据。

- [X] T038 [US3] 实现手动录入服务（参数校验与写入编排） in `backend/src/services/healthManualService.js`
- [X] T039 [US3] 扩展健康记录模型支持 manual 来源入库 in `backend/src/models/healthRecordModel.js`
- [X] T040 [US3] 扩展健康控制器新增 `POST /health/manual` in `backend/src/controllers/healthController.js`
- [X] T041 [US3] 更新健康路由注册 `POST /manual` in `backend/src/routes/health.js`
- [X] T042 [US3] 编写手动录入接口集成测试（失败与成功路径） in `backend/tests/health.manual.test.js`

## 阶段 6（US4: 家属端查看老人健康数据）

**目标**：支持家属通过 `user_id` 查询老人健康数据，并进行关系鉴权。

**独立验证标准**
- 本人查询（不带 `user_id`）行为不变。
- 家属与老人存在关系时，`GET /health/today?user_id=...` 与 `GET /health/trend?user_id=...` 可成功返回。
- 无关系访问返回 403 且不泄露目标用户数据。

- [X] T043 [US4] 实现家属关系查询模型（按 caregiver_id 与 elder_id 校验） in `backend/src/models/familyRelationModel.js`
- [X] T044 [US4] 实现家属访问服务（本人直查 + 关系校验） in `backend/src/services/familyAccessService.js`
- [X] T045 [US4] 实现家属访问中间件（校验查询权限） in `backend/src/middleware/familyAccess.js`
- [X] T046 [US4] 更新健康控制器支持 `user_id` 目标用户查询 in `backend/src/controllers/healthController.js`
- [X] T047 [US4] 更新健康路由在 today/trend 接入 familyAccess in `backend/src/routes/health.js`
- [X] T048 [US4] 编写家属端查询鉴权集成测试 in `backend/tests/health.family.test.js`

## 最终阶段（完善与统一）

**目标**：统一响应规范、环境校验、异常判断工具，并完成全链路回归。

- [X] T049 [P] 实现统一响应工具（`{code,message,data}`） in `backend/src/utils/response.js`
- [X] T050 [P] 实现环境变量校验工具（启动前 fail-fast） in `backend/src/utils/validateEnv.js`
- [X] T051 [P] 实现健康异常判断工具（血压/心率/血氧阈值） in `backend/src/utils/healthAlert.js`
- [X] T052 在应用启动流程接入 `validateEnv` in `backend/src/app.js`
- [X] T053 在健康查询服务接入异常判断输出 in `backend/src/services/healthArchiveService.js`
- [X] T054 在手环同步服务接入异常判断与标记策略 in `backend/src/services/healthSyncService.js`
- [X] T055 在手动录入服务复用异常判断逻辑 in `backend/src/services/healthManualService.js`
- [X] T056 在健康控制器统一使用 response 工具 in `backend/src/controllers/healthController.js`
- [X] T057 在设备控制器统一使用 response 工具 in `backend/src/controllers/deviceController.js`
- [X] T058 编写统一响应格式与异常判定回归测试 in `backend/tests/health.alert-and-response.test.js`
- [X] T059 补充后端运行、迁移、测试说明文档 in `backend/README.md`
- [X] T060 编写健康档案查询性能测试，GET /health-archive 在100并发下 p95 <200ms in `backend/tests/performance/health.perf.test.js`

## 依赖与执行顺序

1. `T001 -> (T002,T003,T004,T005,T006,T007,T008,T009) -> T010 -> T011`
2. `(T012,T013,T014,T015) -> T016 -> T017`
3. `T018 -> T019 -> T020 -> T021`
4. `T021 -> T022 -> T023 -> T024 -> T025 -> T026 -> T027`
5. `T027 -> T028 -> T029 -> T030 -> T031 -> T032 -> T033 -> T034 -> T035 -> T036 -> T037`
6. `T037 -> T038 -> T039 -> T040 -> T041 -> T042`
7. `T042 -> T043 -> T044 -> T045 -> T046 -> T047 -> T048`
8. `(T049,T050,T051) -> T052 -> (T053,T054,T055) -> (T056,T057) -> T058 -> T059`

## 并行执行示例

1. 初始化并行：`T002 + T003 + T004 + T005 + T006 + T007 + T008 + T009`，完成后执行 `T010 -> T011`。
2. 基础设施并行：`T012 + T013 + T014 + T015`，完成后执行 `T016 -> T017`。
3. 完善阶段并行：`T049 + T050 + T051`，完成后执行 `T052`。

## 任务统计

| 阶段 | Task Count | `[P]` Count | US-tagged Count | ID Range |
|---|---:|---:|---:|---|
| 阶段 1 初始化 | 11 | 8 | 0 | T001-T011 |
| 阶段 2 基础设施 | 10 | 4 | 0 | T012-T021 |
| 阶段 3 US1 | 6 | 0 | 6 | T022-T027 |
| 阶段 4 US2 | 10 | 0 | 10 | T028-T037 |
| 阶段 5 US3 | 5 | 0 | 5 | T038-T042 |
| 阶段 6 US4 | 6 | 0 | 6 | T043-T048 |
| 最终阶段 完善 | 12 | 3 | 0 | T049-T060 |
| **Total** | **60** | **15** | **27** | **T001-T060** |
