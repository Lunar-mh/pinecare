# 任务清单: 社区管理端 (013-community-admin)

**功能**: 社区管理端 | **分支**: `013-community-admin`
**范围**: 仅后端 (`backend/`) — 前端（Vue 3）已完成

---

## 可追溯约定
- 本文件内标记 `[USn]` 的任务，对应 `.specify/specs/013-community-admin/spec.md` 中的“用户故事 n”
- 未标记 `[USn]` 的任务为基础设施/横切关注点（鉴权、错误处理、迁移、文档、测试等）
- 本模块任务以“后端实现”为范围；spec.md 中的前端体验指标（字号、按钮尺寸、步骤数等）用于验收与设计约束，不在本 tasks 内重复实现


## 阶段 1：初始化

- [X] T001 初始化后端依赖与脚本（express/mysql2/dotenv/jsonwebtoken，dev/test 脚本） in `backend/package.json`
- [X] T002 创建环境变量模板，补齐 DB/JWT/PORT/分页默认值等配置项 in `backend/.env.example`
- [X] T003 [P] 创建 MySQL 连接池与 query 封装，统一连接超时与错误抛出 in `backend/src/config/db.js`
- [X] T004 [P] 创建社区管理模型骨架并导出方法签名占位 in `backend/src/models/communityAdmin.js`
- [X] T005 [P] 创建社区管理服务骨架并导出 use-case 方法占位 in `backend/src/services/communityAdminService.js`
- [X] T006 [P] 创建社区管理控制器骨架并导出处理器占位 in `backend/src/controllers/communityAdminController.js`

---

## 阶段 2：基础设施（DB 迁移、admin 角色权限中间件）

- [X] T007 编写迁移脚本，创建 `community_admins`、`service_orders`、`community_activities` 表及索引/外键 in `backend/migrations/001_create_community_admin_tables.sql`
- [X] T008 [P] 实现 JWT 鉴权中间件，解析 Bearer Token 并注入 `req.user` in `backend/src/middleware/auth.js`
- [X] T009 [P] 实现 admin 角色校验中间件，校验管理员身份并注入 `req.adminScope` in `backend/src/middleware/adminAuth.js`
- [X] T010 [P] 实现全局错误处理中间件，统一错误响应结构 `{ code, message, data }` in `backend/src/middleware/errorHandler.js`
- [X] T011 创建社区管理路由骨架并统一接入 `auth` + `adminAuth` in `backend/src/routes/communityAdmin.js`
- [X] T012 更新服务入口，挂载 `/admin` 路由并确保 `errorHandler` 在中间件末尾 in `backend/server.js`

---

## 阶段 3：用户故事 1 - 志愿者管理

- [X] T013 [US1] 实现志愿者查询模型 `listVolunteers`，按 `role=volunteer` 联表 `users` 并支持 `community_id` 过滤 in `backend/src/models/communityAdmin.js`
- [X] T014 [US1] 实现志愿者列表服务 `getVolunteers`，处理筛选参数、分页默认值和社区作用域校验 in `backend/src/services/communityAdminService.js`
- [X] T015 [US1] 实现 `getVolunteers` 控制器，返回 `{ code: 0, message: "success", data }` in `backend/src/controllers/communityAdminController.js`
- [X] T016 [US1] 在路由注册 `GET /admin/volunteers` 并接入管理员权限保护 in `backend/src/routes/communityAdmin.js`
- [X] T017 [US1] 完善志愿者列表输出字段映射（用户基础信息、角色、社区、创建时间） in `backend/src/services/communityAdminService.js`
- [X] T018 [US1] 编写志愿者列表集成测试（JWT、admin 角色、community 过滤、分页） in `backend/tests/integration/community-admin-volunteers.test.js`

---

## 阶段 4：用户故事 2 - 服务工单管理（列表/创建）

- [X] T019 [P] [US2] 实现工单号生成器 `generateOrderNo` 与状态枚举校验工具 in `backend/src/services/communityAdminService.js`
- [X] T020 [P] [US2] 实现工单列表模型 `listOrders`/`countOrders`，支持 `status`、`community_id` 过滤与分页 in `backend/src/models/communityAdmin.js`
- [X] T021 [US2] 实现工单列表服务 `getOrders`，统一分页元数据与过滤参数规范化 in `backend/src/services/communityAdminService.js`
- [X] T022 [US2] 实现工单创建模型 `createOrder`，写入 `order_no`、`status=pending`、预约时间字段 in `backend/src/models/communityAdmin.js`
- [X] T023 [US2] 实现工单创建服务 `createOrder`，校验必填字段并调用生成工单号流程 in `backend/src/services/communityAdminService.js`
- [X] T024 [US2] 实现 `getOrders`/`createOrder` 控制器，统一成功与业务错误输出 in `backend/src/controllers/communityAdminController.js`
- [X] T025 [US2] 在路由注册 `GET /admin/orders` 与 `POST /admin/orders` in `backend/src/routes/communityAdmin.js`
- [X] T026 [US2] 编写工单列表与创建集成测试（过滤、分页、pending 默认状态、order_no 唯一） in `backend/tests/integration/community-admin-orders.test.js`

---

## 阶段 5：用户故事 3 - 社区活动管理

- [X] T027 [US3] 实现活动列表模型 `listActivities`，支持 `community_id` 过滤与时间倒序 in `backend/src/models/communityAdmin.js`
- [X] T028 [US3] 实现活动发布模型 `createActivity`，写入标题、内容、开始结束时间与人数上限 in `backend/src/models/communityAdmin.js`
- [X] T029 [US3] 实现活动服务 `getActivities`/`createActivity`，校验时间区间和人数参数 in `backend/src/services/communityAdminService.js`
- [X] T030 [US3] 实现 `getActivities`/`createActivity` 控制器并对齐标准响应 in `backend/src/controllers/communityAdminController.js`
- [X] T031 [US3] 在路由注册 `GET /admin/activities` 与 `POST /admin/activities` in `backend/src/routes/communityAdmin.js`
- [X] T032 [US3] 编写活动列表与发布集成测试（时间校验、community 作用域、响应结构） in `backend/tests/integration/community-admin-activities.test.js`

---

## 阶段 6：用户故事 4 - 数据统计看板

- [X] T033 [US4] 实现统计模型方法，提供活跃老人、志愿者、工单总数与时间银行总时长查询 in `backend/src/models/communityAdmin.js`
- [X] T034 [US4] 实现统计聚合服务 `getCommunityDashboardStats`，汇总概览指标与工单状态分布 in `backend/src/services/statsService.js`
- [X] T035 [US4] 实现社区管理服务 `getStats`，处理 `community_id` 和时间范围参数并调用 statsService in `backend/src/services/communityAdminService.js`
- [X] T036 [US4] 实现 `getStats` 控制器，返回看板数据结构（概览 + 分布） in `backend/src/controllers/communityAdminController.js`
- [X] T037 [US4] 在路由注册 `GET /admin/stats` in `backend/src/routes/communityAdmin.js`
- [X] T038 [US4] 编写统计看板集成测试（字段完整性、聚合正确性、admin 权限） in `backend/tests/integration/community-admin-stats.test.js`

---

## 最终阶段：完善

- [X] T039 [P] 创建统一响应工具 `ok`/`fail`，固化 `{ code, message, data }` 输出 in `backend/src/utils/response.js`
- [X] T040 [P] 创建社区管理参数校验中间件（query/body、分页上限、枚举校验） in `backend/src/middleware/validateCommunityAdmin.js`
- [X] T041 将社区管理控制器切换到统一响应工具并收敛重复错误处理逻辑 in `backend/src/controllers/communityAdminController.js`
- [X] T042 在社区管理路由接入参数校验中间件并规范中间件执行顺序 in `backend/src/routes/communityAdmin.js`
- [X] T043 编写 API 契约测试，覆盖 volunteers/orders/activities/stats 端点的响应结构与鉴权约束 in `backend/tests/contract/community-admin-api.contract.test.js`
- [X] T044 完善服务启动自检与优雅关闭（DB ping、连接释放、异常退出处理） in `backend/server.js`
- [X] T045 编写社区看板统计接口性能测试，GET /admin/stats 在50并发下 p95 <500ms in `backend/tests/performance/communityAdmin.stats.perf.test.js`

---

## 依赖与执行顺序

```text
T001 → T002 → T003, T004, T005, T006 (可并行)
T003, T004, T005, T006 → T007
T007 → T008, T009, T010 (可并行) → T011 → T012

[US1] T011, T012 → T013 → T014 → T015 → T016 → T017 → T018
[US2] T011, T012 → T019, T020 (可并行) → T021 → T022 → T023 → T024 → T025 → T026
[US3] T011, T012 → T027 → T028 → T029 → T030 → T031 → T032
[US4] T011, T012 → T033 → T034 → T035 → T036 → T037 → T038

[Final] T018, T026, T032, T038 → T039, T040 (可并行) → T041 → T042 → T043 → T044
```

---

## 统计信息

- 阶段总数: 7（阶段 1-6 + 最终阶段）
- 总任务数: 45
- 初始化 任务数: 6
- 基础设施 任务数: 6
- US1 任务数: 6
- US2 任务数: 8
- US3 任务数: 6
- US4 任务数: 6
- 最终阶段 任务数: 7
- 可并行任务数 `[P]`: 11
