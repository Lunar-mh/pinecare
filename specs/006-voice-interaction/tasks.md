# 任务清单: 语音交互基础 (006-voice-interaction)

**功能**: 语音交互基础 | **分支**: `006-voice-interaction`
**范围**: 仅后端 (`backend/`) — 前端已完成 | **任务总数**: 35

---

## 可追溯约定
- 本文件内标记 `[USn]` 的任务，对应 `.specify/specs/006-voice-interaction/spec.md` 中的“用户故事 n”
- 未标记 `[USn]` 的任务为基础设施/横切关注点（鉴权、错误处理、迁移、文档、测试等）
- 本模块任务以“后端实现”为范围；spec.md 中的前端体验指标（字号、按钮尺寸、步骤数等）用于验收与设计约束，不在本 tasks 内重复实现


## 阶段 1：初始化

- [X] T001 初始化后端依赖与脚本（express/mysql2/axios/dotenv/jsonwebtoken，start/dev/test） in `backend/package.json`
- [X] T002 [P] 创建环境变量模板，补齐 `DB_*`、`JWT_SECRET`、`ALIYUN_ACCESS_KEY_ID`、`ALIYUN_ACCESS_KEY_SECRET`、`PORT` in `backend/.env.example`
- [X] T003 创建 MySQL 连接配置，导出连接池与 query 封装 in `backend/src/config/db.js`
- [X] T004 创建服务启动入口，加载 dotenv、初始化 Express、挂载语音路由并预留优雅关闭 in `backend/server.js`

---

## 阶段 2：基础设施

- [X] T005 [P] 创建 JWT 鉴权中间件，解析 Bearer Token 并注入 `req.user.userId` in `backend/src/middleware/auth.js`
- [X] T006 [P] 创建全局错误处理中间件，统一输出 `{ code, message, data }` in `backend/src/middleware/errorHandler.js`
- [X] T007 编写数据库迁移脚本，创建 `voice_sessions` 与 `voice_command_logs`（含索引与外键） in `backend/migrations/001_create_voice_tables.sql`
- [X] T008 [P] 创建语音数据模型，封装会话创建/结束与指令日志写入方法 in `backend/src/models/voice.js`
- [X] T009 创建语音领域服务骨架，封装会话轮次更新与日志记录公共流程 in `backend/src/services/voiceService.js`
- [X] T010 [P] 创建语音控制器骨架，预留 recognize/synthesize/history 处理器并统一成功响应 in `backend/src/controllers/voiceController.js`
- [X] T011 创建语音路由骨架，挂载鉴权并绑定控制器处理器 in `backend/src/routes/voice.js`

---

## 阶段 3：用户故事 1 - 语音识别（ASR）

- [X] T012 [P] [US1] 实现阿里云 ASR 服务，接收 base64 音频并返回识别文本（含错误码映射） in `backend/src/services/asrService.js`
- [X] T013 [US1] 实现识别业务流程：调用 ASR、校验唤醒词“银伴银伴”、落库 `recognized_text` 日志 in `backend/src/services/voiceService.js`
- [X] T014 [US1] 实现 `POST /voice/recognize` 控制器，按统一结构返回识别结果 in `backend/src/controllers/voiceController.js`
- [X] T015 [US1] 在路由注册 `POST /voice/recognize` 并接入 auth 中间件 in `backend/src/routes/voice.js`
- [X] T016 [P] [US1] 编写识别成功集成测试，校验返回文本与日志落库 in `backend/tests/integration/voice.recognize.test.js`
- [X] T017 [P] [US1] 编写识别异常集成测试，覆盖缺少唤醒词与非法音频入参 in `backend/tests/integration/voice.recognize.error.test.js`

---

## 阶段 4：用户故事 2 - 语音合成（TTS）

- [X] T018 [P] [US2] 实现阿里云 TTS 服务，按 150 字/分钟配置语速并返回 base64 音频 in `backend/src/services/ttsService.js`
- [X] T019 [US2] 实现合成业务流程：文本校验、调用 TTS、落库 `response_text` 与音频生成记录 in `backend/src/services/voiceService.js`
- [X] T020 [US2] 实现 `POST /voice/synthesize` 控制器，返回音频 base64 与元信息 in `backend/src/controllers/voiceController.js`
- [X] T021 [US2] 在路由注册 `POST /voice/synthesize` 并接入 auth 中间件 in `backend/src/routes/voice.js`
- [X] T022 [P] [US2] 编写合成成功集成测试，校验返回音频格式与响应结构 in `backend/tests/integration/voice.synthesize.test.js`
- [X] T023 [P] [US2] 编写合成异常集成测试，覆盖空文本与上游 TTS 失败场景 in `backend/tests/integration/voice.synthesize.error.test.js`

---

## 阶段 5：用户故事 3 - 会话日志管理

- [X] T024 [P] [US3] 扩展语音模型，增加会话分页查询与按会话查询日志方法 in `backend/src/models/voice.js`
- [X] T025 [US3] 实现会话历史服务，提供用户会话列表与会话详情日志查询（含归属校验） in `backend/src/services/voiceService.js`
- [X] T026 [US3] 实现会话日志控制器，新增 `getSessions` 与 `getSessionLogs` 处理器 in `backend/src/controllers/voiceController.js`
- [X] T027 [US3] 在路由注册 `GET /voice/sessions` 与 `GET /voice/sessions/:sessionId/logs` in `backend/src/routes/voice.js`
- [X] T028 [P] [US3] 编写会话列表集成测试，覆盖分页与时间倒序返回 in `backend/tests/integration/voice.sessions.test.js`
- [X] T029 [P] [US3] 编写会话日志权限集成测试，校验跨用户访问被拒绝 in `backend/tests/integration/voice.session-logs.test.js`

---

## 最终阶段：完善

- [X] T030 [P] 创建语音请求参数校验中间件，统一校验 audio/text/sessionId/page/pageSize in `backend/src/middleware/validators.js`
- [X] T031 在语音路由接入参数校验中间件并统一 400 错误返回结构 in `backend/src/routes/voice.js`
- [X] T032 [P] 创建启动前环境变量校验模块，缺失关键配置时阻止服务启动 in `backend/src/config/env.js`
- [X] T033 在服务入口接入环境校验与优雅关闭（释放 MySQL 连接池） in `backend/server.js`
- [X] T034 [P] 编写端到端流程测试，串联 recognize → synthesize → sessions/logs in `backend/tests/integration/voice.e2e.test.js`
- [X] T035 [P] 更新测试与开发脚本，确保语音模块可在 CI 中一键执行 in `backend/package.json`
- [X] T036 编写语音接口性能测试，POST /voice/recognize 在50并发下 p95 <2s in `backend/tests/performance/voice.perf.test.js

---

## Dependencies 说明

```text
T001 → T003 → T004
T001 → T002 (可并行)

T003 → T008 → T009
T001 → T005, T006, T007, T010 (可并行)
T005, T006, T009, T010 → T011

[US1] T011, T009 → T012 → T013 → T014 → T015 → T016, T017 (可并行)
[US2] T011, T009 → T018 → T019 → T020 → T021 → T022, T023 (可并行)
[US3] T011, T009, T024 → T025 → T026 → T027 → T028, T029 (可并行)

[Final] T011 → T030 → T031
[Final] T004 → T032 → T033
[Final] T015, T021, T027 → T034
[Final] T001, T034 → T035
```

- 核心依赖原则：先完成基础设施（鉴权/错误处理/迁移），再进入各用户故事实现。
- 各 US 的测试任务均依赖对应接口落地后执行，可在同阶段末并行。
- 最终阶段 以横切治理为主，不改变业务主流程语义。

## 并行执行示例

**阶段 2 并行组（完成 T001 后）**
```text
T005 (auth.js) || T006 (errorHandler.js) || T007 (migration SQL) || T010 (voiceController.js)
```

**US1 并行组（完成 T015 后）**
```text
T016 (voice.recognize.test.js) || T017 (voice.recognize.error.test.js)
```

**US2 并行组（完成 T021 后）**
```text
T022 (voice.synthesize.test.js) || T023 (voice.synthesize.error.test.js)
```

**US3 并行组（完成 T027 后）**
```text
T028 (voice.sessions.test.js) || T029 (voice.session-logs.test.js)
```

**Final 并行组**
```text
T032 (env.js) || T030 (validators.js)
```

---

## 任务统计

| 阶段 | 任务数 |
|---|---:|
| 阶段 1: 初始化 | 4 |
| 阶段 2: 基础设施 | 7 |
| 阶段 3: US1 - 语音识别（ASR） | 6 |
| 阶段 4: US2 - 语音合成（TTS） | 6 |
| 阶段 5: US3 - 会话日志管理 | 6 |
| 最终阶段: 完善 | 7 |
| **总任务数** | **36** |

- 阶段数：6
- 总任务数：36
