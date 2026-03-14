# 任务清单: 智慧用药提醒 (003-medication-reminder)

**功能**: 智慧用药提醒 | **分支**: `003-medication-reminder`  
**范围**: 仅后端 (`backend/`) — 前端已完成 | **任务总数**: 85

---

## 可追溯约定
- 本文件内标记 `[USn]` 的任务，对应 `.specify/specs/003-medication-reminder/spec.md` 中的“用户故事 n”
- 未标记 `[USn]` 的任务为基础设施/横切关注点（鉴权、错误处理、迁移、文档、测试等）
- 本模块任务以“后端实现”为范围；spec.md 中的前端体验指标（字号、按钮尺寸、步骤数等）用于验收与设计约束，不在本 tasks 内重复实现


## 阶段 1: 初始化（初始化）
- [X] T001 初始化后端依赖与脚本（含 `node-cron`、`dotenv`、`mysql2`、`ioredis`、`jsonwebtoken`） in `backend/package.json`
- [X] T002 创建环境变量模板（MySQL/Redis/JWT/微信通知配置） in `backend/.env.example`
- [X] T003 创建服务入口并加载环境变量 in `backend/server.js`
- [X] T004 创建配置目录占位文件 in `backend/src/config/.gitkeep`
- [X] T005 [P] 创建控制器目录占位文件 in `backend/src/controllers/.gitkeep`
- [X] T006 [P] 创建中间件目录占位文件 in `backend/src/middleware/.gitkeep`
- [X] T007 [P] 创建模型目录占位文件 in `backend/src/models/.gitkeep`
- [X] T008 [P] 创建路由目录占位文件 in `backend/src/routes/.gitkeep`
- [X] T009 [P] 创建服务目录占位文件 in `backend/src/services/.gitkeep`
- [X] T010 [P] 创建定时任务目录占位文件 in `backend/src/jobs/.gitkeep`
- [X] T011 [P] 创建工具目录占位文件 in `backend/src/utils/.gitkeep`
- [X] T012 [P] 创建迁移目录占位文件 in `backend/migrations/.gitkeep`

## 阶段 2: 基础设施（基础设施）
- [X] T013 实现 MySQL 连接池与事务封装 in `backend/src/config/database.js`
- [X] T014 [P] 实现 Redis 客户端与重连策略 in `backend/src/config/redis.js`
- [X] T015 [P] 实现 JWT Bearer 认证中间件 in `backend/src/middleware/auth.js`
- [X] T016 [P] 实现统一错误处理中间件 in `backend/src/middleware/errorHandler.js`
- [X] T017 [P] 实现统一响应封装 `{code,message,data}` in `backend/src/utils/response.js`
- [X] T018 创建应用装配（express、middleware、routes） in `backend/src/app.js`
- [X] T019 创建路由总入口并挂载 `/medication` in `backend/src/routes/index.js`
- [X] T020 编写迁移：创建 `medication_plans` 表 in `backend/migrations/001_create_medication_plans.sql`
- [X] T021 [P] 编写迁移：创建 `medication_logs` 表 in `backend/migrations/002_create_medication_logs.sql`
- [X] T022 [P] 编写迁移：创建 `medication_settings` 表 in `backend/migrations/003_create_medication_settings.sql`
- [X] T023 [P] 编写迁移：创建 `reminder_queue` 表 in `backend/migrations/004_create_reminder_queue.sql`
- [X] T024 编写迁移：补充索引、外键与约束 in `backend/migrations/005_add_medication_indexes_and_fks.sql`
- [X] T025 创建迁移执行脚本（按序执行 SQL） in `backend/src/utils/migrate.js`

## 阶段 3: US1 添加并管理用药计划（P1, MVP）
目标：实现 `/medication/plans` 全量 CRUD，保证 JWT 鉴权与统一响应结构。  
独立验证标准：  
1. `POST /medication/plans` 成功创建计划并返回 `{code,message,data}`。  
2. `GET /medication/plans` 仅返回当前用户计划列表。  
3. `PUT /medication/plans/:id` 仅可修改本人计划。  
4. `DELETE /medication/plans/:id` 删除后列表不可见。  

- [X] T026 [US1] 实现用药计划数据访问（列表/新增/更新/删除） in `backend/src/models/medicationPlanModel.js`
- [X] T027 [P] [US1] 实现用药计划请求校验（`frequency`、`remind_times`、日期区间） in `backend/src/middleware/validators/medicationPlanValidator.js`
- [X] T028 [US1] 实现用药计划业务服务（归属校验、启停状态） in `backend/src/services/medicationPlanService.js`
- [X] T029 [US1] 实现用药计划控制器（GET/POST/PUT/DELETE） in `backend/src/controllers/medicationPlanController.js`
- [X] T030 [US1] 实现 `/medication/plans` 路由并接入认证/校验 in `backend/src/routes/medicationPlanRoutes.js`
- [X] T031 [US1] 在路由总入口注册 plans 路由 in `backend/src/routes/index.js`
- [X] T032 [US1] 实现计划响应 DTO 映射与字段白名单 in `backend/src/utils/medicationPlanPresenter.js`
- [X] T033 [US1] 在计划控制器接入统一响应封装 in `backend/src/controllers/medicationPlanController.js`
- [X] T034 [US1] 编写计划 CRUD 集成测试 in `backend/tests/medication.plans.test.js`
- [X] T035 [US1] 编写计划测试数据构建器 in `backend/tests/helpers/medicationPlanFactory.js`

## 阶段 4: US2 接收提醒并确认服药（P2）
目标：实现提醒生成、微信首提醒/二次提醒、确认服药、记录查询。  
独立验证标准：  
1. 每分钟任务命中 `remind_times` 时创建 `pending` 日志并发送首提醒。  
2. 30 分钟未确认触发二次提醒并记录队列状态。  
3. 2 小时未确认自动转 `missed`。  
4. `POST /medication/confirm` 可将记录更新为 `taken/skipped` 并写入 `actual_time`。  
5. `GET /medication/logs` 支持 `start_date/end_date` 过滤。  

- [X] T036 [US2] 实现服药记录数据访问（查询区间、状态更新） in `backend/src/models/medicationLogModel.js`
- [X] T037 [P] [US2] 实现提醒队列数据访问（入队、发送状态更新） in `backend/src/models/reminderQueueModel.js`
- [X] T038 [US2] 实现提醒调度服务（按分钟匹配并创建日志） in `backend/src/services/reminderScheduleService.js`
- [X] T039 [US2] 实现提醒通知服务（首提醒/二次提醒与队列落库） in `backend/src/services/reminderNotificationService.js`
- [X] T040 [US2] 实现服药确认服务（幂等、防越权） in `backend/src/services/medicationConfirmService.js`
- [X] T041 [P] [US2] 实现服药记录查询服务（日期过滤） in `backend/src/services/medicationLogService.js`
- [X] T042 [US2] 实现 logs/confirm 控制器 in `backend/src/controllers/medicationLogController.js`
- [X] T043 [US2] 实现 `/medication/logs` 与 `/medication/confirm` 路由 in `backend/src/routes/medicationLogRoutes.js`
- [X] T044 [US2] 在路由总入口注册 logs/confirm 路由 in `backend/src/routes/index.js`
- [X] T045 [US2] 实现每分钟提醒任务（创建日志+首提醒+入队） in `backend/src/jobs/medicationReminderJob.js`
- [X] T046 [US2] 实现每 5 分钟跟进任务（30 分钟二次提醒、2 小时转 missed） in `backend/src/jobs/medicationFollowupJob.js`
- [X] T047 [US2] 创建定时任务启动器并注册 cron in `backend/src/jobs/index.js`
- [X] T048 [US2] 在应用启动时加载定时任务 in `backend/src/app.js`
- [X] T049 [US2] 编写 logs/confirm 接口集成测试 in `backend/tests/medication.logs-confirm.test.js`
- [X] T050 [US2] 编写提醒与跟进任务测试 in `backend/tests/jobs.medication-reminder.test.js`

## 阶段 5: US3 查看服药历史日历（P3）
目标：实现 `GET /medication/history/calendar` 月历聚合查询。  
独立验证标准：  
1. `month=YYYY-MM` 返回按天聚合的 `taken/missed/skipped` 统计。  
2. 非法 `month` 参数返回校验错误。  
3. 仅返回当前用户数据。  

- [X] T051 [US3] 实现历史聚合查询服务（按天统计） in `backend/src/services/medicationHistoryService.js`
- [X] T052 [US3] 实现历史日历控制器 in `backend/src/controllers/medicationHistoryController.js`
- [X] T053 [US3] 实现历史日历路由 in `backend/src/routes/medicationHistoryRoutes.js`
- [X] T054 [US3] 在路由总入口注册历史日历路由 in `backend/src/routes/index.js`
- [X] T055 [US3] 新增月视图查询索引迁移 in `backend/migrations/006_add_medication_logs_calendar_index.sql`
- [X] T056 [US3] 实现 `month` 参数校验器（`YYYY-MM`） in `backend/src/middleware/validators/historyCalendarValidator.js`
- [X] T057 [US3] 在历史控制器接入参数校验与统一响应 in `backend/src/controllers/medicationHistoryController.js`
- [X] T058 [US3] 编写历史日历接口集成测试 in `backend/tests/medication.history-calendar.test.js`

## 阶段 6: US4 提醒设置与家属同步（P4）
目标：实现提醒设置、家属同步通知与续药提醒全链路。  
独立验证标准：  
1. `GET/PUT /medication/settings` 可读写用户设置并保持默认值策略。  
2. `family_sync_enabled=true` 且 2 小时未确认时发送家属通知。  
3. `remaining_quantity <= reminder_threshold` 时触发续药提醒。  
4. `reminder_enabled=false` 或处于睡眠时段时不发送常规提醒。  

- [X] T059 [US4] 实现提醒设置数据访问（按用户查询与 upsert） in `backend/src/models/medicationSettingModel.js`
- [X] T060 [US4] 实现提醒设置服务（默认值、睡眠时段校验） in `backend/src/services/medicationSettingService.js`
- [X] T061 [US4] 实现提醒设置控制器（GET/PUT） in `backend/src/controllers/medicationSettingController.js`
- [X] T062 [US4] 实现 `/medication/settings` 路由 in `backend/src/routes/medicationSettingRoutes.js`
- [X] T063 [US4] 在路由总入口注册 settings 路由 in `backend/src/routes/index.js`
- [X] T064 [US4] 实现提醒策略服务（`reminder_enabled` 与睡眠窗口判定） in `backend/src/services/reminderPolicyService.js`
- [X] T065 [US4] 在每分钟提醒任务接入提醒策略过滤 in `backend/src/jobs/medicationReminderJob.js`
- [X] T066 [US4] 实现家属通知服务（family 提醒） in `backend/src/services/familyNotificationService.js`
- [X] T067 [US4] 扩展跟进任务支持 2 小时未确认家属通知 in `backend/src/jobs/medicationFollowupJob.js`
- [X] T068 [US4] 实现续药提醒服务（库存天数阈值计算） in `backend/src/services/refillReminderService.js`
- [X] T069 [US4] 实现续药提醒定时任务 in `backend/src/jobs/refillReminderJob.js`
- [X] T070 [US4] 在任务启动器注册续药提醒任务 in `backend/src/jobs/index.js`
- [X] T071 [US4] 新增设置唯一约束与队列表索引迁移 in `backend/migrations/007_add_settings_and_queue_indexes.sql`
- [X] T072 [US4] 编写 settings 接口集成测试 in `backend/tests/medication.settings.test.js`
- [X] T073 [US4] 编写家属同步与续药任务测试 in `backend/tests/jobs.family-refill.test.js`

## 最终阶段：完善
- [X] T074 实现环境变量校验（必填项、默认值、类型转换） in `backend/src/config/validateEnv.js`
- [X] T075 在启动入口接入 `validateEnv` 并阻断无效配置启动 in `backend/server.js`
- [X] T076 封装微信服务通知客户端（`templateId` 读取、重试、错误映射） in `backend/src/utils/wechatNotifier.js`
- [X] T077 将提醒通知服务改造为调用统一微信客户端 in `backend/src/services/reminderNotificationService.js`
- [X] T078 [P] 将家属通知服务改造为调用统一微信客户端 in `backend/src/services/familyNotificationService.js`
- [X] T079 [P] 将续药提醒服务改造为调用统一微信客户端 in `backend/src/services/refillReminderService.js`
- [X] T080 实现健康检查控制器（MySQL/Redis 状态） in `backend/src/controllers/healthController.js`
- [X] T081 实现 `/health` 路由 in `backend/src/routes/healthRoutes.js`
- [X] T082 在路由总入口挂载 `/health` in `backend/src/routes/index.js`
- [X] T083 编写后端 smoke 测试（鉴权、响应格式、健康检查） in `backend/tests/smoke.api.test.js`
- [X] T084 补充后端运行手册（迁移、cron、环境变量、告警排查） in `backend/README.md`
- [X] T085 编写提醒调度性能测试，10,000用户同时触发提醒时任务处理完成时间 <30s in `backend/tests/performance/reminder.perf.test.js`

## 依赖与执行顺序
1. 先执行 阶段 1（T001-T012）与 阶段 2（T013-T025），完成可运行骨架与数据库基础设施。  
2. US 执行顺序：US1（T026-T035）→ US2（T036-T050）→ US3（T051-T058）→ US4（T059-T073）。  
3. 关键依赖：T024 依赖 T020-T023；T031 依赖 T030；T044 依赖 T043；T047 依赖 T045-T046；T070 依赖 T069；T075 依赖 T074；T077-T079 依赖 T076；T082 依赖 T081。  
4. 测试任务放在各自功能链末尾执行：T034/T049/T050/T058/T072/T073/T083。  
5. 最终阶段（T074-T084）在全部 US 任务完成后执行。  

## 并行执行示例
1. 初始化目录并行：T005, T006, T007, T008, T009, T010, T011, T012。  
2. 基础中间件并行：T014, T015, T016, T017。  
3. 基础表迁移并行：T021, T022, T023（随后串行执行 T024）。  
4. US1 并行：T027 可与 T026 并行。  
5. US2 并行：T037 与 T041 可并行。  
6. Final 并行：T078 与 T079 可并行。  

## 任务统计

| 阶段 | Tasks | [P] Tasks | User Story |
|---|---:|---:|---|
| 阶段 1 初始化 | 12 | 8 | N/A |
| 阶段 2 基础设施 | 13 | 7 | N/A |
| 阶段 3 US1 | 10 | 1 | US1 |
| 阶段 4 US2 | 15 | 2 | US2 |
| 阶段 5 US3 | 8 | 0 | US3 |
| 阶段 6 US4 | 15 | 0 | US4 |
| 最终阶段 完善 | 12 | 2 | N/A |
| **Total** | **85** | **20** | **US1-US4** |
