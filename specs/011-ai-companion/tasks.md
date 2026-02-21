# 任务清单: AI陪伴 (011-ai-companion)

**功能**: AI陪伴 | **分支**: `011-ai-companion`
**范围**: 仅后端 (`backend/`) — 前端已完成

---

## 可追溯约定
- 本文件内标记 `[USn]` 的任务，对应 `.specify/specs/011-ai-companion/spec.md` 中的“用户故事 n”
- 未标记 `[USn]` 的任务为基础设施/横切关注点（鉴权、错误处理、迁移、文档、测试等）
- 本模块任务以“后端实现”为范围；spec.md 中的前端体验指标（字号、按钮尺寸、步骤数等）用于验收与设计约束，不在本 tasks 内重复实现


## 阶段 1：初始化

- [ ] T001 初始化后端依赖与脚本（express/mysql2/ioredis/axios/dotenv/jsonwebtoken，start/dev/test） in `backend/package.json`
- [ ] T002 创建后端目录骨架（src/config、controllers、middleware、models、routes、services，migrations，tests） in `backend/src/`
- [ ] T003 [P] 创建环境变量模板，补齐 DB/REDIS/JWT/DASHSCOPE/QWEN/PORT 配置项 in `backend/.env.example`
- [ ] T004 [P] 创建 Express 服务启动入口，加载 dotenv、注册 JSON 解析与基础中间件、预留路由挂载与优雅关闭 in `backend/server.js`
- [ ] T005 [P] 创建 Jest + Supertest 测试基座与公共初始化逻辑 in `backend/tests/setup.js`

---

## 阶段 2：基础设施

- [ ] T006 [P] 编写迁移脚本，创建 `companion_sessions`、`game_records`、`emotion_tracks` 三表及索引/唯一键 in `backend/migrations/001_create_companion_tables.sql`
- [ ] T007 [P] 实现 MySQL 连接池与 query 封装（mysql2/promise） in `backend/src/config/db.js`
- [ ] T008 [P] 实现 Redis 客户端配置、重连策略与错误日志 in `backend/src/config/redis.js`
- [ ] T009 [P] 实现 JWT 鉴权中间件，解析 Bearer Token 并注入 `req.user.userId` in `backend/src/middleware/auth.js`
- [ ] T010 [P] 实现全局错误处理中间件，统一输出 `{ code, message, data }` in `backend/src/middleware/errorHandler.js`
- [ ] T011 [P] 创建通义千问客户端基础配置（endpoint、model、api key、timeout） in `backend/src/services/qwenService.js`
- [ ] T012 [P] 创建情绪分析服务基础能力，导出文本情感评分与归一化函数 in `backend/src/services/emotionService.js`
- [ ] T013 创建陪伴模型，封装会话、游戏记录、情绪轨迹的基础读写方法 in `backend/src/models/companion.js`
- [ ] T014 创建陪伴服务骨架，定义 chat/getGames/recordGame/getEmotionTrend/getNostalgia 接口 in `backend/src/services/companionService.js`

---

## 阶段 3：用户故事 1 - AI情感对话（接入通义千问）

- [ ] T015 [P] [US1] 在 Qwen 服务实现 `chatWithQwen(messages, userId)`，完成 axios 调用、异常映射与回复提取 in `backend/src/services/qwenService.js`
- [ ] T016 [P] [US1] 在情绪服务实现 `analyzeDialogEmotion(message, reply)`，输出 0-100 情绪分 in `backend/src/services/emotionService.js`
- [ ] T017 [US1] 在陪伴服务实现聊天上下文管理（按 userId 读取/裁剪/写回 Redis 历史） in `backend/src/services/companionService.js`
- [ ] T018 [US1] 在陪伴服务实现 `chat(userId, message)` 主流程：提示词构建→Qwen调用→情绪计算→结果组装 in `backend/src/services/companionService.js`
- [ ] T019 [US1] 在陪伴模型实现 `createChatSession` 与 `upsertEmotionTrackByDate` 持久化方法 in `backend/src/models/companion.js`
- [ ] T020 [US1] 在陪伴服务集成对话落库（`companion_sessions` + `emotion_tracks`）并返回业务 data in `backend/src/services/companionService.js`
- [ ] T021 [US1] 实现 `POST /companion/chat` 控制器，校验 message 并返回统一响应结构 in `backend/src/controllers/companionController.js`
- [ ] T022 [US1] 注册 `POST /companion/chat` 路由并接入 JWT 鉴权 in `backend/src/routes/companion.js`

---

## 阶段 4：用户故事 2 - 认知训练游戏（列表+成绩记录）

- [ ] T023 [P] [US2] 在陪伴服务定义游戏列表（数字记忆、词语接龙、拼图）及规则元数据 in `backend/src/services/companionService.js`
- [ ] T024 [P] [US2] 在陪伴模型实现 `createGameRecord` 与用户成绩查询方法 in `backend/src/models/companion.js`
- [ ] T025 [US2] 在陪伴服务实现 `getGames()`，返回标准游戏列表数据结构 in `backend/src/services/companionService.js`
- [ ] T026 [US2] 在陪伴服务实现 `recordGame(userId, payload)`，校验 gameType/score/difficulty/duration 并写入成绩 in `backend/src/services/companionService.js`
- [ ] T027 [US2] 在控制器实现 `GET /companion/games` 与 `POST /companion/game/record` 处理器 in `backend/src/controllers/companionController.js`
- [ ] T028 [US2] 在路由注册 `GET /games`、`POST /game/record`（record 接入鉴权） in `backend/src/routes/companion.js`

---

## 阶段 5：用户故事 3 - 情绪趋势分析

- [ ] T029 [P] [US3] 在陪伴模型实现近 30 天情绪数据按日查询与聚合 SQL in `backend/src/models/companion.js`
- [ ] T030 [P] [US3] 在情绪服务实现趋势指标计算（均值、波动、上升/下降标签） in `backend/src/services/emotionService.js`
- [ ] T031 [US3] 在陪伴服务实现 `getEmotionTrend(userId)`，补齐缺失日期并生成趋势图数据 in `backend/src/services/companionService.js`
- [ ] T032 [US3] 在控制器实现 `GET /companion/emotion`，返回近 30 天趋势分析结果 in `backend/src/controllers/companionController.js`
- [ ] T033 [US3] 在路由注册 `GET /emotion` 并接入 JWT 鉴权 in `backend/src/routes/companion.js`

---

## 阶段 6：用户故事 4 - 怀旧内容推荐

- [ ] T034 [P] [US4] 在陪伴服务构建 1950s-1990s 怀旧内容库（老歌/老电影/老照片） in `backend/src/services/companionService.js`
- [ ] T035 [US4] 在陪伴服务实现 `getNostalgia(decade, userId)`，支持 decade 兜底与 nostalgia 会话记录 in `backend/src/services/companionService.js`
- [ ] T036 [US4] 在控制器实现 `GET /companion/nostalgia?decade=` 参数解析与响应组装 in `backend/src/controllers/companionController.js`
- [ ] T037 [US4] 在路由注册 `GET /nostalgia`（无需鉴权） in `backend/src/routes/companion.js`

---

## 最终阶段：完善

- [ ] T038 [P] 创建统一响应工具 `ok()`/`fail()`，固化 `{ code, message, data }` 格式 in `backend/src/utils/response.js`
- [ ] T039 [P] 创建请求参数校验中间件，覆盖 chat/game record/nostalgia decade 入参 in `backend/src/middleware/validator.js`
- [ ] T040 将 companion 控制器切换到统一响应工具并规范错误映射 in `backend/src/controllers/companionController.js`
- [ ] T041 [P] 创建 Redis 限流中间件，限制 `POST /companion/chat` 调用频率 in `backend/src/middleware/rateLimiter.js`
- [ ] T042 编写 API 契约与集成测试，覆盖 5 个端点的鉴权、响应结构和关键业务分支 in `backend/tests/contract/companion-api.contract.test.js`
- [ ] T043 编写AI陪伴接口性能测试，POST /companion/chat 在50并发下 p95 <5s in `backend/tests/performance/companion.perf.test.js`

---

## 依赖与执行顺序

```text
T001 → T002 → T003, T004, T005 (可并行)
T002 → T006, T007, T008, T009, T010, T011, T012 (可并行)
T007 → T013
T011, T012, T013 → T014

[US1] T014, T008, T011, T012, T013 → T015, T016 (可并行) → T017 → T018
[US1] T013 → T019
[US1] T018, T019 → T020 → T021 → T022

[US2] T014, T013 → T023, T024 (可并行)
[US2] T023 → T025
[US2] T024 → T026
[US2] T025, T026 → T027 → T028

[US3] T013 → T029
[US3] T012 → T030
[US3] T029, T030, T014 → T031 → T032 → T033

[US4] T014 → T034 → T035 → T036 → T037

[Final] T022, T028, T033, T037 → T038, T039, T041 (可并行)
[Final] T038, T039 → T040
[Final] T040, T041 → T042
```

---

## 并行执行示例

**阶段 2 并行组（完成 T002 后）**
```text
T006 (migration SQL) || T007 (db.js) || T008 (redis.js) || T009 (auth.js) || T010 (errorHandler.js) || T011 (qwenService.js) || T012 (emotionService.js)
```

**US1 并行组（完成 T014 后）**
```text
T015 (qwenService chat call) || T016 (emotionService dialog scoring)
```

**Final 并行组**
```text
T038 (response.js) || T039 (validator.js) || T041 (rateLimiter.js)
```

---

## Implementation Strategy

- **MVP**: 阶段 1 + 阶段 2 + 阶段 3（先上线 AI 情感对话核心链路）
- **迭代 2**: + 阶段 4（补齐游戏列表与成绩记录）
- **迭代 3**: + 阶段 5（上线情绪趋势分析）
- **迭代 4**: + 阶段 6 + 最终阶段（怀旧推荐与发布前收敛）

---

## 统计信息

- 阶段数: 7（阶段 1-6 + 最终阶段）
- 总任务数: 43
- 初始化: 5
- 基础设施: 9
- US1: 8
- US2: 6
- US3: 5
- US4: 4
- Final: 6
- 可并行任务数（标记 `[P]`）: 20
