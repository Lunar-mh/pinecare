# 任务清单: AI健康顾问 (008-ai-health-advice)

**功能**: AI健康顾问 | **分支**: `008-ai-health-advice`
**范围**: 仅后端 (backend/) — 前端已完成 | **任务总数**: 29

---

## 可追溯约定
- 本文件内标记 `[USn]` 的任务，对应 `.specify/specs/008-ai-health-advice/spec.md` 中的“用户故事 n”
- 未标记 `[USn]` 的任务为基础设施/横切关注点（鉴权、错误处理、迁移、文档、测试等）
- 本模块任务以“后端实现”为范围；spec.md 中的前端体验指标（字号、按钮尺寸、步骤数等）用于验收与设计约束，不在本 tasks 内重复实现


## 阶段 1: 项目初始化

- [ ] T001 初始化 backend/package.json，安装 express mysql2 ioredis axios dotenv jsonwebtoken uuid 及 devDependencies (jest supertest nodemon) in `backend/package.json`
- [ ] T002 创建 backend 完整目录结构: src/{config,controllers,middleware,models,routes,services,utils}, tests/{unit,integration,contract}, migrations in `backend/src/`
- [ ] T003 [P] 创建环境变量模板，包含 DB_HOST/PORT/USER/PASSWORD/DB_NAME, REDIS_HOST/PORT, DASHSCOPE_API_KEY, ALIYUN_ACCESS_KEY_ID/SECRET, JWT_SECRET, PORT in `backend/.env.example`
- [ ] T004 [P] 创建 Express 服务入口文件，加载 dotenv、引入 app、监听端口、优雅关闭 in `backend/server.js`

---

## 阶段 2: 基础设施

- [ ] T005 [P] 创建 MySQL 连接池配置，使用 mysql2/promise createPool，导出 pool 和 query 辅助函数 in `backend/src/config/database.js`
- [ ] T006 [P] 创建 Redis 连接配置，使用 ioredis，导出 redis 实例，支持连接错误处理 in `backend/src/config/redis.js`
- [ ] T007 [P] 创建 JWT 认证中间件，从 Authorization header 解析 Bearer token，验证签名，将 userId 注入 req.user，失败返回 401 in `backend/src/middleware/auth.js`
- [ ] T008 [P] 创建统一错误处理中间件，捕获全局异常，区分业务错误与系统错误，统一响应格式 {code, message, data}，生产环境隐藏堆栈 in `backend/src/middleware/errorHandler.js`
- [ ] T009 创建 Express app 配置，注册 json 解析、cors、auth 中间件、路由挂载、errorHandler，导出 app 实例 in `backend/src/app.js`
- [ ] T010 创建路由根文件，挂载 /ai-consult 前缀路由到 aiConsult 路由模块 in `backend/src/routes/index.js`
- [ ] T011 [P] 编写数据库迁移 SQL，创建 consult_records、health_profiles、sensitive_records 三张表及索引 in `backend/migrations/001_create_ai_consult_tables.sql`

---

## 阶段 3：用户故事 1 — 文字健康咨询 (P1, MVP)

**目标**: 用户发送文字消息，AI 基于健康画像返回个性化建议，消息存历史
**独立验证**: POST /ai-consult/chat 返回 `{reply, sessionId}`；GET /ai-consult/history 返回消息数组

- [ ] T012 [P] [US1] 创建 ConsultRecord 模型，封装 create/findBySession/findByUser 方法 in `backend/src/models/consultRecord.js`
- [ ] T013 [P] [US1] 创建系统提示词模板工具，导出 buildSystemPrompt(healthProfile) 函数，嵌入用户健康数据和免责声明 in `backend/src/utils/promptTemplate.js`
- [ ] T014 [P] [US1] 创建健康上下文服务，封装 getContextForUser(userId) 方法，从 health_profiles 表查询数据格式化为 AI 上下文消息数组 in `backend/src/services/healthContextService.js`
- [ ] T015 [US1] 创建 AI 服务，封装 chat(userId, message, sessionId)：获取健康上下文 → 构建提示词 → 加载历史 → axios POST 调用 DashScope qwen-turbo → 返回回复和 token 消耗 in `backend/src/services/aiService.js`
- [ ] T016 [US1] 创建 AI 咨询控制器，实现 sendChat (POST /chat) 和 getHistory (GET /history) 处理器 in `backend/src/controllers/aiConsultController.js`
- [ ] T017 [US1] 创建 AI 咨询路由模块，注册 POST /chat 和 GET /history，使用 auth 中间件 in `backend/src/routes/aiConsult.js`

---

## 阶段 4：用户故事 2 — 语音健康咨询 (P2)

**目标**: 用户发送 base64 音频，ASR 识别 → AI 回复 → TTS 合成，返回文字 + 音频
**独立验证**: POST /ai-consult/voice 返回 `{reply, audioData}`

- [ ] T018 [US2] 创建语音服务，封装 speechToText(audioBase64) 调用阿里云 ASR，textToSpeech(text) 调用阿里云 TTS（语速 0.8，温柔女声） in `backend/src/services/voiceService.js`
- [ ] T019 [US2] 在控制器中添加 voiceConsult 处理器：接收 audioData → ASR 识别 → AI 咨询 → TTS 合成 → 返回 {reply, audioData} in `backend/src/controllers/aiConsultController.js`
- [ ] T020 [US2] 在路由模块注册 POST /voice → voiceConsult，使用 auth 中间件 in `backend/src/routes/aiConsult.js`

---

## 阶段 5：用户故事 3 — 健康画像管理 (P3)

**目标**: 用户查看/更新健康画像，为 AI 提供个性化上下文
**独立验证**: GET /ai-consult/profile 返回画像数据；PUT /ai-consult/profile 更新成功

- [ ] T021 [US3] 创建 HealthProfile 模型，封装 findByUserId/upsert 方法，JSON 字段自动序列化 in `backend/src/models/healthProfile.js`
- [ ] T022 [US3] 在控制器中添加 getProfile 和 updateProfile 处理器 in `backend/src/controllers/aiConsultController.js`
- [ ] T023 [US3] 在路由模块注册 GET /profile 和 PUT /profile，使用 auth 中间件 in `backend/src/routes/aiConsult.js`

---

## 最终阶段：完善 & 横切关注点

- [ ] T024 [P] 创建内容安全服务，敏感词过滤 + 阿里云内容安全 API，不安全时自动记录 SensitiveRecord in `backend/src/services/contentSafetyService.js`
- [ ] T025 [P] 创建 SensitiveRecord 模型，封装 create/findByUser/markHandled 方法 in `backend/src/models/sensitiveRecord.js`
- [ ] T026 集成内容安全到 chat/voice 流程，高风险拦截，中低风险记录放行 in `backend/src/controllers/aiConsultController.js`
- [ ] T027 [P] 创建请求限流中间件，基于 Redis 滑动窗口，AI 接口限 30 次/分钟/用户，超限返回 429 in `backend/src/middleware/rateLimiter.js`
- [ ] T028 [P] 创建环境变量启动验证，检查必需变量，缺失则抛出明确错误并退出 in `backend/src/utils/validateEnv.js`
- [ ] T029 编写AI咨询接口性能测试，POST /ai-consult/chat 在50并发下 p95 <5s in `backend/tests/performance/aiConsult.perf.test.js`

---

## 依赖与执行顺序

```
T001 → T002 → T003, T004 (可并行)
T002 → T005, T006, T007, T008 (可并行)
T005, T006, T007, T008 → T009 → T010
T002 → T011 (可并行，独立迁移文件)

[US1] T010, T011 → T012, T013, T014 (可并行) → T015 → T016 → T017
[US2] T017 → T018 → T019 → T020
[US3] T017 → T021 → T022 → T023
[Final] T017 → T024, T025 (可并行) → T026 → T027, T028 (可并行)
```

## 并行执行示例

**阶段 2 并行组**（完成 T002 后同时执行）:
```
T005 (database.js) || T006 (redis.js) || T007 (auth.js) || T008 (errorHandler.js) || T011 (migration SQL)
```

**US1 并行组**（完成 T010+T011 后同时执行）:
```
T012 (consultRecord.js) || T013 (promptTemplate.js) || T014 (healthContextService.js)
```

**Final 并行组**:
```
T024 (contentSafetyService.js) || T025 (sensitiveRecord.js)
T027 (rateLimiter.js) || T028 (validateEnv.js)
```

## Implementation Strategy

- **MVP**: 阶段 1 + 阶段 2 + 阶段 3 (US1) — 文字咨询核心功能可独立上线
- **迭代 2**: + 阶段 4 (US2) — 添加语音能力
- **迭代 3**: + 阶段 5 (US3) — 健康画像自助管理
- **迭代 4**: + 最终阶段 — 内容安全与限流加固

## Key Configuration

- **DashScope Endpoint**: `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`
- **模型**: `qwen-turbo`
- **响应格式**: `{code, message, data}` 统一结构
- **认证**: JWT Bearer Token，通过 auth 中间件注入 `req.user.userId`
