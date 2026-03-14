# 任务清单: GPS定位追踪 (014-gps-tracking)

**功能**: GPS定位追踪 | **分支**: `014-gps-tracking`
**范围**: 仅后端 (`backend/`) — 前端已完成

---

## 可追溯约定
- 本文件内标记 `[USn]` 的任务，对应 `.specify/specs/014-gps-tracking/spec.md` 中的“用户故事 n”
- 未标记 `[USn]` 的任务为基础设施/横切关注点（鉴权、错误处理、迁移、文档、测试等）
- 本模块任务以“后端实现”为范围；spec.md 中的前端体验指标（字号、按钮尺寸、步骤数等）用于验收与设计约束，不在本 tasks 内重复实现


## 阶段 1：初始化

- [X] T001 初始化后端依赖与脚本（express/mysql2/ioredis/dotenv/jsonwebtoken） in `backend/package.json`
- [X] T002 创建环境变量模板（MySQL/Redis/JWT/PORT） in `backend/.env.example`
- [X] T003 创建服务启动入口（加载 dotenv、监听端口、优雅关闭钩子） in `backend/server.js`

## 阶段 2：基础设施

- [X] T004 [P] 实现 MySQL 连接池与 query 封装 in `backend/src/config/database.js`
- [X] T005 [P] 实现 Redis 客户端连接与重连策略 in `backend/src/config/redis.js`
- [X] T006 [P] 实现 JWT Bearer 鉴权中间件并注入 `req.user.userId` in `backend/src/middleware/auth.js`
- [X] T007 [P] 实现全局错误处理中间件并统一输出 `{code,message,data}` in `backend/src/middleware/errorHandler.js`
- [X] T008 创建 Express app 装配（json 解析、路由、errorHandler） in `backend/src/app.js`
- [X] T009 创建路由聚合入口并挂载 `/location` in `backend/src/routes/index.js`
- [X] T010 [P] 编写迁移：创建 `location_records` 表与索引 in `backend/migrations/001_create_location_records.sql`
- [X] T011 [P] 编写迁移：创建 `geo_fences` 表与索引 in `backend/migrations/002_create_geo_fences.sql`
- [X] T012 [P] 编写迁移：创建 `fence_alerts` 表与索引 in `backend/migrations/003_create_fence_alerts.sql`

## 阶段 3：用户故事 1 - 实时位置上传与查询

**目标**：实现 `POST /location/upload` 与 `GET /location/current`，并使用 Redis 缓存最新位置。

- [X] T013 [P] [US1] 实现位置记录模型（写入位置、查询最新位置） in `backend/src/models/locationRecordModel.js`
- [X] T014 [P] [US1] 实现位置缓存工具（`location:{userId}` 的读写与 TTL 策略） in `backend/src/services/locationCacheService.js`
- [X] T015 [US1] 实现位置上传服务（写 MySQL + 更新 Redis 最新位置） in `backend/src/services/locationService.js`
- [X] T016 [US1] 实现当前位置查询服务（优先 Redis，fallback MySQL） in `backend/src/services/locationService.js`
- [X] T017 [US1] 实现位置控制器（upload/current 的入参解析与响应封装） in `backend/src/controllers/locationController.js`
- [X] T018 [US1] 创建 location 路由并注册 `POST /upload`、`GET /current`（接入 auth） in `backend/src/routes/locationRoutes.js`
- [X] T019 [US1] 在路由聚合入口挂载 locationRoutes in `backend/src/routes/index.js`

## 阶段 4：用户故事 2 - 轨迹查询

**目标**：实现 `GET /location/trail?startDate=&endDate=`，返回时间范围内轨迹点。

- [X] T020 [P] [US2] 扩展位置记录模型支持按时间范围查询轨迹 in `backend/src/models/locationRecordModel.js`
- [X] T021 [US2] 实现轨迹查询服务（参数校验、排序、分页策略说明） in `backend/src/services/locationTrailService.js`
- [X] T022 [US2] 实现轨迹控制器（startDate/endDate 校验与统一响应） in `backend/src/controllers/locationController.js`
- [X] T023 [US2] 在路由中注册 `GET /trail` 并接入 auth in `backend/src/routes/locationRoutes.js`

## 阶段 5：用户故事 3 - 电子围栏管理

**目标**：实现 `GET /location/fences` 与 `POST /location/fences`，支持 circle/polygon 两种围栏。

- [X] T024 [P] [US3] 实现围栏模型（列表、创建、启停字段写入） in `backend/src/models/geoFenceModel.js`
- [X] T025 [US3] 实现围栏服务（circle/polygon 入参校验、默认值策略） in `backend/src/services/fenceService.js`
- [X] T026 [US3] 实现围栏控制器（list/create） in `backend/src/controllers/fenceController.js`
- [X] T027 [US3] 在路由中注册 `GET /fences`、`POST /fences` 并接入 auth in `backend/src/routes/locationRoutes.js`

## 阶段 6：用户故事 4 - 围栏告警列表与处理

**目标**：实现 `GET /location/alerts`，并在位置上传时生成越界告警记录。

- [X] T028 [P] [US4] 实现告警模型（创建告警、告警列表、标记处理） in `backend/src/models/fenceAlertModel.js`
- [X] T029 [P] [US4] 实现围栏判定工具（点在圆形/多边形内判断 + enter/exit/both 规则） in `backend/src/utils/geoFenceMath.js`
- [X] T030 [US4] 在位置上传服务接入围栏检查：越界时写入 `fence_alerts` in `backend/src/services/locationService.js`
- [X] T031 [US4] 实现告警列表服务（按时间倒序、过滤 is_handled） in `backend/src/services/alertService.js`
- [X] T032 [US4] 实现告警控制器（alerts 列表统一响应） in `backend/src/controllers/alertController.js`
- [X] T033 [US4] 在路由中注册 `GET /alerts` 并接入 auth in `backend/src/routes/locationRoutes.js`

## 最终阶段：完善

- [X] T034 [P] 实现统一响应工具（`ok()`/`fail()`） in `backend/src/utils/response.js`
- [X] T035 在各控制器统一使用 response 工具并规范错误码映射 in `backend/src/controllers/locationController.js`
- [X] T036 在各控制器统一使用 response 工具并规范错误码映射 in `backend/src/controllers/fenceController.js`
- [X] T037 在各控制器统一使用 response 工具并规范错误码映射 in `backend/src/controllers/alertController.js`
- [X] T038 [P] 实现环境变量校验（启动前 fail-fast） in `backend/src/utils/validateEnv.js`
- [X] T039 在启动流程接入 validateEnv 并补充健康检查路由（DB/Redis） in `backend/src/app.js`
- [X] T040 补充后端运行说明（迁移、Redis key 约定、隐私/权限说明） in `backend/README.md`
- [X] T041 编写GPS位置上传性能测试，POST /gps/location 在500并发下 p95 <200ms in `backend/tests/performance/gps.perf.test.js`

## 依赖与执行顺序

1. `T001 -> T002 -> T003`
2. `(T004,T005,T006,T007) -> T008 -> T009 -> (T010,T011,T012)`
3. `US1: T013 -> T014 -> T015 -> T016 -> T017 -> T018 -> T019`
4. `US2: T020 -> T021 -> T022 -> T023`
5. `US3: T024 -> T025 -> T026 -> T027`
6. `US4: (T028,T029) -> T030 -> T031 -> T032 -> T033`
7. `完善: (T034,T038) -> T035,T036,T037 -> T039 -> T040`

## 并行执行示例

- 阶段 2 并行：`T004 || T005 || T006 || T007 || T010 || T011 || T012`
- US4 并行：`T028 || T029`
- 完善 并行：`T034 || T038`

## 任务统计

- 阶段数: 7
- 任务总数: 41
- 初始化: 3
- 基础设施: 9
- US1: 7
- US2: 4
- US3: 4
- US4: 6
- 完善: 8
