# 任务清单: 时间银行 (010-time-bank)

**功能**: 时间银行 | **分支**: `010-time-bank`
**范围**: 仅后端 (`backend/`) — 前端已完成 | **任务总数**: 41

---

## 可追溯约定
- 本文件内标记 `[USn]` 的任务，对应 `.specify/specs/010-time-bank/spec.md` 中的“用户故事 n”
- 未标记 `[USn]` 的任务为基础设施/横切关注点（鉴权、错误处理、迁移、文档、测试等）
- 本模块任务以“后端实现”为范围；spec.md 中的前端体验指标（字号、按钮尺寸、步骤数等）用于验收与设计约束，不在本 tasks 内重复实现


## 阶段 1：初始化

- [X] T001 初始化后端依赖与脚本（express/mysql2/ioredis/dotenv/jsonwebtoken，start/dev/test） in `backend/package.json`
- [X] T002 [P] 创建 MySQL 连接配置，导出连接池与 `query` 方法 in `backend/src/config/db.js`
- [X] T003 [P] 创建 Redis 连接配置，导出客户端与连接异常处理 in `backend/src/config/redis.js`
- [X] T004 创建服务启动入口，加载 dotenv、初始化 Express、挂载 time-bank 路由与错误中间件 in `backend/server.js`

---

## 阶段 2：基础设施

- [X] T005 [P] 编写数据库迁移脚本，创建 `time_accounts`、`service_records`、`exchange_records` 三表及索引/约束 in `backend/migrations/001_create_time_bank_tables.sql`
- [X] T006 [P] 实现 JWT Bearer 鉴权中间件，校验 token 并注入 `req.user.userId` in `backend/src/middleware/auth.js`
- [X] T007 [P] 实现全局错误处理中间件，统一输出 `{ code, message, data }` in `backend/src/middleware/errorHandler.js`
- [X] T008 [P] 实现哈希链工具，提供记录哈希生成、前序哈希拼接与链完整性校验能力 in `backend/src/utils/hashChain.js`
- [X] T009 实现数字签名服务，支持服务者/被服务者/平台三方签名生成与验签 in `backend/src/services/credentialService.js`
- [X] T010 实现 TimeBank 数据访问基础方法（账户初始化、通用查询、事务封装） in `backend/src/models/timeBank.js`
- [X] T011 创建 TimeBank 服务层骨架，定义 account/service/exchange/leaderboard 用例入口 in `backend/src/services/timeBankService.js`
- [X] T012 创建 TimeBank 控制器骨架，封装 success 响应函数并预留 8 个处理器 in `backend/src/controllers/timeBankController.js`
- [X] T013 创建 TimeBank 路由骨架，接入 auth 中间件并注册 8 个 API 路由位 in `backend/src/routes/timeBank.js`

---

## 阶段 3：用户故事 1 - 账户查询（余额、信用等级）

- [X] T014 [US1] 实现账户查询方法 `getOrCreateAccountByUserId(userId)`，返回余额、累计收支、信用评分与等级 in `backend/src/models/timeBank.js`
- [X] T015 [US1] 实现服务方法 `getAccount(userId)` 与 `getBalance(userId)`，统一账户不存在时自动开户逻辑 in `backend/src/services/timeBankService.js`
- [X] T016 [US1] 实现控制器 `getAccount` 与 `getBalance`，返回 `{ code: 0, message: "success", data }` in `backend/src/controllers/timeBankController.js`
- [X] T017 [US1] 注册 `GET /time-bank/account` 与 `GET /time-bank/balance` 路由并绑定处理器 in `backend/src/routes/timeBank.js`

---

## 阶段 4：用户故事 2 - 服务记录（记录+确认，含哈希链存证）

- [X] T018 [US2] 实现服务记录数据访问方法（取最新 `record_hash`、写入 `service_records`、按 id 查询/更新状态） in `backend/src/models/timeBank.js`
- [X] T019 [US2] 扩展哈希链工具，按规范字段顺序生成 `record_hash` 并提供单条记录验链方法 in `backend/src/utils/hashChain.js`
- [X] T020 [US2] 扩展签名服务，生成并验证服务记录 `provider_signature`、`recipient_signature`、`platform_signature` in `backend/src/services/credentialService.js`
- [X] T021 [US2] 实现 `recordService`：计算时长与时间币、生成 `prev_hash/record_hash`、写入 `pending` 记录 in `backend/src/services/timeBankService.js`
- [X] T022 [US2] 实现 `confirmService`：支持 confirm/cancel 状态流转、三方签名落库、确认后原子更新账户余额与累计值 in `backend/src/services/timeBankService.js`
- [X] T023 [US2] 实现控制器 `recordService` 与 `confirmService`，校验必填参数与状态流转合法性 in `backend/src/controllers/timeBankController.js`
- [X] T024 [US2] 注册 `POST /time-bank/service/record` 与 `POST /time-bank/service/confirm` 路由 in `backend/src/routes/timeBank.js`

---

## 阶段 5：用户故事 3 - 服务历史查询

- [X] T025 [US3] 实现服务历史查询方法 `listServiceHistory(userId, type, page, pageSize)`，支持 provided/received 过滤与分页 in `backend/src/models/timeBank.js`
- [X] T026 [US3] 实现服务方法 `getServiceHistory(userId, type, page, pageSize)`，返回记录状态、哈希与签名摘要字段 in `backend/src/services/timeBankService.js`
- [X] T027 [US3] 实现控制器 `getServiceHistory`，校验 `type=provided|received` 并统一响应结构 in `backend/src/controllers/timeBankController.js`
- [X] T028 [US3] 注册 `GET /time-bank/service/history` 路由并绑定处理器 in `backend/src/routes/timeBank.js`

---

## 阶段 6：用户故事 4 - 时间币兑换

- [X] T029 [US4] 实现兑换数据访问方法（创建兑换记录、扣减余额、写入 completed_at）并确保事务一致性 in `backend/src/models/timeBank.js`
- [X] T030 [US4] 实现服务方法 `createExchange(userId, payload)`，执行余额校验、扣币、记录 `exchange_records` 流程 in `backend/src/services/timeBankService.js`
- [X] T031 [US4] 实现控制器 `createExchange`，校验 `exchangeType/itemName/coinsRequired` 并返回兑换结果 in `backend/src/controllers/timeBankController.js`
- [X] T032 [US4] 注册 `POST /time-bank/exchange` 路由并绑定处理器 in `backend/src/routes/timeBank.js`

---

## 阶段 7：用户故事 5 - 兑换历史 & 排行榜

- [X] T033 [US5] 实现兑换历史与排行榜查询方法（`listExchangeHistoryByUser`、`getCommunityLeaderboard`） in `backend/src/models/timeBank.js`
- [X] T034 [US5] 实现服务方法 `getExchangeHistory(userId)` 与 `getLeaderboard(communityId)`，增加排行榜 Redis 缓存与失效策略 in `backend/src/services/timeBankService.js`
- [X] T035 [US5] 实现控制器 `getExchangeHistory` 与 `getLeaderboard`，处理 `communityId` 参数与空结果返回 in `backend/src/controllers/timeBankController.js`
- [X] T036 [US5] 注册 `GET /time-bank/exchange/history` 与 `GET /time-bank/leaderboard` 路由 in `backend/src/routes/timeBank.js`

---

## 最终阶段：完善

- [X] T037 [P] 完善错误处理中间件，补齐 400/401/403/404/409/422/500 映射并保持统一返回体 in `backend/src/middleware/errorHandler.js`
- [X] T038 收敛时间银行服务缓存策略，补齐 account/balance/leaderboard 缓存更新与失效逻辑 in `backend/src/services/timeBankService.js`
- [X] T039 [P] 完善服务启动与关闭流程，增加 MySQL/Redis 优雅释放与健康检查接口 in `backend/server.js`
- [X] T040 [P] 更新依赖与脚本，补齐 migration/test/smoke 命令并锁定 Node 18 运行约束 in `backend/package.json`
- [X] T041 编写时间银行关键链路集成测试（account -> record -> confirm -> exchange -> history） in `backend/tests/integration/timeBank.e2e.test.js`
- [X] T042 编写时间银行查询性能测试，GET /time-bank/leaderboard 在200并发下 p95 <200ms in `backend/tests/performance/timeBank.perf.test.js`

---

## 依赖与执行顺序

```text
阶段 1:
T001 -> T002, T003 (可并行) -> T004

阶段 2:
T004 -> T005, T006, T007, T008 (可并行) -> T009 -> T010 -> T011 -> T012 -> T013

US1:
T013, T010 -> T014 -> T015 -> T016 -> T017

US2:
T017 -> T018 -> T019 -> T020 -> T021 -> T022 -> T023 -> T024

US3:
T024 -> T025 -> T026 -> T027 -> T028

US4:
T028 -> T029 -> T030 -> T031 -> T032

US5:
T032 -> T033 -> T034 -> T035 -> T036

Final:
T036 -> T037, T039, T040 (可并行) -> T038 -> T041
```

---

## 并行执行示例

**阶段 1 并行组（完成 T001 后）**
```text
T002 (backend/src/config/db.js) || T003 (backend/src/config/redis.js)
```

**阶段 2 并行组（完成 T004 后）**
```text
T005 (migration SQL) || T006 (auth.js) || T007 (errorHandler.js) || T008 (hashChain.js)
```

**Final 并行组（完成 T036 后）**
```text
T037 (errorHandler.js) || T039 (server.js) || T040 (package.json)
```

---

## 任务统计

| 阶段 | 任务数 |
|---|---:|
| 阶段 1: 初始化 | 4 |
| 阶段 2: 基础设施 | 9 |
| 阶段 3: US1 - 账户查询（余额、信用等级） | 4 |
| 阶段 4: US2 - 服务记录（记录+确认，含哈希链存证） | 7 |
| 阶段 5: US3 - 服务历史查询 | 4 |
| 阶段 6: US4 - 时间币兑换 | 4 |
| 阶段 7: US5 - 兑换历史 & 排行榜 | 4 |
| 最终阶段: 完善 | 6 |
| **总任务数** | **42** |

- 阶段数：8
- 用户故事阶段任务数：23
- 并行任务标记数（[P]）：9
