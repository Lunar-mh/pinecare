# 任务清单: 医疗资源整合 (015-medical-integration)

**功能**: 医疗资源整合 | **分支**: `015-medical-integration`
**范围**: 仅后端 (`backend/`) — 前端已完成

---

## 可追溯约定
- 本文件内标记 `[USn]` 的任务，对应 `.specify/specs/015-medical-integration/spec.md` 中的“用户故事 n”
- 未标记 `[USn]` 的任务为基础设施/横切关注点（鉴权、错误处理、迁移、文档、测试等）
- 本模块任务以“后端实现”为范围；spec.md 中的前端体验指标（字号、按钮尺寸、步骤数等）用于验收与设计约束，不在本 tasks 内重复实现


## 阶段 1：初始化

- [X] T001 初始化后端依赖与脚本（express/mysql2/axios/dotenv/jsonwebtoken） in `backend/package.json`
- [X] T002 创建环境变量模板（MySQL/JWT/PORT/第三方医疗API配置占位） in `backend/.env.example`
- [X] T003 创建服务启动入口（加载 dotenv、监听端口、优雅关闭钩子） in `backend/server.js`

## 阶段 2：基础设施

- [X] T004 [P] 实现 MySQL 连接池与 query 封装 in `backend/src/config/database.js`
- [X] T005 [P] 实现 JWT Bearer 鉴权中间件并注入 `req.user.userId` in `backend/src/middleware/auth.js`
- [X] T006 [P] 实现全局错误处理中间件并统一输出 `{code,message,data}` in `backend/src/middleware/errorHandler.js`
- [X] T007 创建 Express app 装配（json 解析、路由、errorHandler） in `backend/src/app.js`
- [X] T008 创建路由聚合入口并挂载 `/medical` in `backend/src/routes/index.js`
- [X] T009 [P] 编写迁移：创建 `online_consultations` 表与索引 in `backend/migrations/001_create_online_consultations.sql`
- [X] T010 [P] 编写迁移：创建 `appointments` 表与索引 in `backend/migrations/002_create_appointments.sql`
- [X] T011 [P] 编写迁移：创建 `medical_reports` 表与索引 in `backend/migrations/003_create_medical_reports.sql`

## 阶段 3：用户故事 1 - 医院/科室/医生查询（含缓存策略）

**目标**：实现 `GET /medical/hospitals`、`GET /medical/departments`、`GET /medical/doctors`，明确第三方 API 的依赖与失败语义。

- [X] T012 [P] [US1] 实现第三方医疗 API 客户端封装（超时、重试、错误映射；不写死具体 URL） in `backend/src/services/medicalApiService.js`
- [X] T013 [P] [US1] 实现医院/科室/医生本地缓存模型（表结构与更新策略说明） in `backend/src/models/medicalDirectoryModel.js`
- [X] T014 [US1] 实现目录查询服务（优先本地缓存，必要时回源第三方并刷新缓存） in `backend/src/services/medicalDirectoryService.js`
- [X] T015 [US1] 实现目录控制器（hospitals/departments/doctors） in `backend/src/controllers/medicalDirectoryController.js`
- [X] T016 [US1] 创建 medical 路由并注册目录查询接口 in `backend/src/routes/medicalRoutes.js`
- [X] T017 [US1] 在路由聚合入口挂载 medicalRoutes in `backend/src/routes/index.js`

## 阶段 4：用户故事 2 - 在线问诊

**目标**：实现 `POST /medical/consult/start`，创建问诊记录并返回问诊会话信息（由第三方返回）。

- [X] T018 [P] [US2] 实现在线问诊模型（创建/更新状态/按用户查询） in `backend/src/models/onlineConsultationModel.js`
- [X] T019 [US2] 实现在线问诊服务（调用第三方创建会话、落库 online_consultations、状态流转约束） in `backend/src/services/onlineConsultationService.js`
- [X] T020 [US2] 实现在线问诊控制器（start 入口，统一响应与错误映射） in `backend/src/controllers/onlineConsultationController.js`
- [X] T021 [US2] 在路由中注册 `POST /consult/start` 并接入 auth in `backend/src/routes/medicalRoutes.js`

## 阶段 5：用户故事 3 - 预约挂号

**目标**：实现 `POST /medical/appointment`，对接第三方预约并落库 appointments。

- [X] T022 [P] [US3] 实现预约挂号模型（创建/按用户查询/状态更新） in `backend/src/models/appointmentModel.js`
- [X] T023 [US3] 实现预约挂号服务（参数校验、调用第三方、落库与幂等键策略说明） in `backend/src/services/appointmentService.js`
- [X] T024 [US3] 实现预约挂号控制器（appointment 入口，统一响应） in `backend/src/controllers/appointmentController.js`
- [X] T025 [US3] 在路由中注册 `POST /appointment` 并接入 auth in `backend/src/routes/medicalRoutes.js`

## 阶段 6：用户故事 4 - 检查报告查询

**目标**：实现 `GET /medical/reports`，从第三方拉取/或查询本地同步结果并返回报告列表。

- [X] T026 [P] [US4] 实现检查报告模型（按用户查询、按 report_no 去重 upsert） in `backend/src/models/medicalReportModel.js`
- [X] T027 [US4] 实现检查报告服务（第三方拉取、同步到 medical_reports、返回列表） in `backend/src/services/medicalReportService.js`
- [X] T028 [US4] 实现检查报告控制器（reports 入口，统一响应） in `backend/src/controllers/medicalReportController.js`
- [X] T029 [US4] 在路由中注册 `GET /reports` 并接入 auth in `backend/src/routes/medicalRoutes.js`

## 最终阶段：完善

- [X] T030 [P] 实现统一响应工具（`ok()`/`fail()`） in `backend/src/utils/response.js`
- [X] T031 在各控制器统一使用 response 工具并规范错误码映射 in `backend/src/controllers/medicalDirectoryController.js`
- [X] T032 在各控制器统一使用 response 工具并规范错误码映射 in `backend/src/controllers/onlineConsultationController.js`
- [X] T033 在各控制器统一使用 response 工具并规范错误码映射 in `backend/src/controllers/appointmentController.js`
- [X] T034 在各控制器统一使用 response 工具并规范错误码映射 in `backend/src/controllers/medicalReportController.js`
- [X] T035 [P] 实现环境变量校验（启动前 fail-fast；第三方 API 配置占位校验） in `backend/src/utils/validateEnv.js`
- [X] T036 补充后端运行说明（第三方依赖假设、错误语义、字段脱敏要求） in `backend/README.md`
- [X] T037 编写体检报告查询性能测试，GET /medical/reports 在50并发下 p95 <2s in `backend/tests/performance/medical.reports.perf.test.js`

## 依赖与执行顺序

1. `T001 -> T002 -> T003`
2. `(T004,T005,T006) -> T007 -> T008 -> (T009,T010,T011)`
3. `US1: (T012,T013) -> T014 -> T015 -> T016 -> T017`
4. `US2: T018 -> T019 -> T020 -> T021`
5. `US3: T022 -> T023 -> T024 -> T025`
6. `US4: T026 -> T027 -> T028 -> T029`
7. `完善: (T030,T035) -> T031,T032,T033,T034 -> T036`

## 并行执行示例

- 阶段 2 并行：`T004 || T005 || T006 || T009 || T010 || T011`
- US1 并行：`T012 || T013`
- 完善 并行：`T030 || T035`

## 任务统计

- 阶段数: 7
- 任务总数: 37
- 初始化: 3
- 基础设施: 8
- US1: 6
- US2: 4
- US3: 4
- US4: 4
- 完善: 8
