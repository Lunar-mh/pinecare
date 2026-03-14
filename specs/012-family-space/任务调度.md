# 任务清单: 家庭空间 (012-family-space)

**功能**: 家庭空间 | **分支**: `012-family-space`
**范围**: 仅后端 (`backend/`) — 前端已完成 | **任务总数**: 39

---

## 可追溯约定
- 本文件内标记 `[USn]` 的任务，对应 `.specify/specs/012-family-space/spec.md` 中的“用户故事 n”
- 未标记 `[USn]` 的任务为基础设施/横切关注点（鉴权、错误处理、迁移、文档、测试等）
- 本模块任务以“后端实现”为范围；spec.md 中的前端体验指标（字号、按钮尺寸、步骤数等）用于验收与设计约束，不在本 tasks 内重复实现


## 阶段 1：初始化

- [X] T001 初始化后端依赖与脚本（express/mysql2/ali-oss/multer/dotenv/jsonwebtoken，start/dev/test） in `backend/package.json`
- [X] T002 [P] 创建环境变量模板，补齐 `DB_*`、`JWT_SECRET`、`OSS_REGION`、`OSS_BUCKET`、`OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET`、`PORT` in `backend/.env.example`
- [X] T003 [P] 创建 MySQL 连接配置，导出连接池与 `query` 方法 in `backend/src/config/db.js`
- [X] T004 创建服务启动入口，加载 dotenv、初始化 Express、挂载 `/family` 路由并注册错误中间件 in `backend/server.js`

---

## 阶段 2：基础设施

- [X] T005 [P] 编写迁移脚本，创建 `voice_messages`、`family_albums`、`family_points` 三张表及查询索引 in `backend/migrations/001_create_family_space_tables.sql`
- [X] T006 [P] 实现 JWT Bearer 鉴权中间件，校验 token 并注入 `req.user.userId` in `backend/src/middleware/auth.js`
- [X] T007 [P] 实现全局错误处理中间件，统一输出 `{ code, message, data }` in `backend/src/middleware/errorHandler.js`
- [X] T008 [P] 实现上传中间件，分别配置音频/图片 `multer` 存储、类型白名单与大小限制 in `backend/src/middleware/upload.js`
- [X] T009 [P] 实现 OSS 客户端配置，读取环境变量并导出可复用实例 in `backend/src/config/oss.js`
- [X] T010 实现 OSS 服务层，封装 `uploadAudio`、`uploadImage`、`buildPublicUrl` 方法 in `backend/src/services/ossService.js`
- [X] T011 实现数据模型基础方法，封装用户家庭归属查询与跨家庭访问校验 in `backend/src/models/familySpace.js`
- [X] T012 实现家庭空间服务骨架，定义 message/album/points/leaderboard 用例入口 in `backend/src/services/familySpaceService.js`
- [X] T013 实现家庭空间控制器骨架，预留 6 个处理器并复用成功响应函数 in `backend/src/controllers/familySpaceController.js`
- [X] T014 实现家庭空间路由骨架，接入 auth 与 upload 中间件并注册 6 个 API 路由 in `backend/src/routes/familySpace.js`

---

## 阶段 3：用户故事 1 - 语音留言（发送/列表）

- [X] T015 [US1] 实现语音留言模型方法 `createVoiceMessage` 与 `listReceivedVoiceMessages` in `backend/src/models/familySpace.js`
- [X] T016 [US1] 实现发送语音留言服务：上传音频到 OSS、写入 `voice_messages`、返回 `audio_url` in `backend/src/services/familySpaceService.js`
- [X] T017 [US1] 实现留言列表服务：按当前用户查询收到的留言并返回播放状态 in `backend/src/services/familySpaceService.js`
- [X] T018 [US1] 实现控制器 `sendMessage` 与 `listMessages`，统一返回 `{ code: 0, message: "success", data }` in `backend/src/controllers/familySpaceController.js`
- [X] T019 [US1] 注册 `POST /family/message/send` 与 `GET /family/message/list` 路由并绑定控制器 in `backend/src/routes/familySpace.js`
- [X] T020 [US1] 编写语音留言集成测试，覆盖发送成功、文件格式错误、列表查询与排序 in `backend/tests/integration/family-space.message.test.js`

---

## 阶段 4：用户故事 2 - 电子相册（上传/列表）

- [X] T021 [US2] 实现相册与积分模型方法 `createAlbumPhoto`、`listAlbumByFamilyId`、`addFamilyPoints` in `backend/src/models/familySpace.js`
- [X] T022 [US2] 实现上传相册服务：上传图片到 OSS、写入 `family_albums` 并新增孝心值记录 in `backend/src/services/familySpaceService.js`
- [X] T023 [US2] 实现相册列表服务：按 `family_id` 查询并按 `created_at` 倒序返回 in `backend/src/services/familySpaceService.js`
- [X] T024 [US2] 实现控制器 `uploadAlbum` 与 `listAlbum`，处理参数校验失败与权限错误 in `backend/src/controllers/familySpaceController.js`
- [X] T025 [US2] 注册 `POST /family/album/upload` 与 `GET /family/album/list` 路由并绑定控制器 in `backend/src/routes/familySpace.js`
- [X] T026 [US2] 编写电子相册集成测试，覆盖上传成功、家庭隔离与积分累加 in `backend/tests/integration/family-space.album.test.js`

---

## 阶段 5：用户故事 3 - 孝心值系统（查询/排行榜）

- [X] T027 [US3] 实现积分模型方法 `getUserPointsTotal`、`listUserPointsDetails`、`getFamilyLeaderboard` in `backend/src/models/familySpace.js`
- [X] T028 [US3] 实现孝心值查询服务：返回当前用户总分与明细列表 in `backend/src/services/familySpaceService.js`
- [X] T029 [US3] 实现排行榜服务：按 `family_id` 聚合积分并按总分降序返回 in `backend/src/services/familySpaceService.js`
- [X] T030 [US3] 实现控制器 `getPoints` 与 `getLeaderboard`，统一返回成功结构 in `backend/src/controllers/familySpaceController.js`
- [X] T031 [US3] 注册 `GET /family/points` 与 `GET /family/leaderboard` 路由并绑定控制器 in `backend/src/routes/familySpace.js`
- [X] T032 [US3] 编写孝心值与排行榜集成测试，覆盖空数据、并列分与分页参数 in `backend/tests/integration/family-space.points.test.js`

---

## 最终阶段：完善

- [X] T033 [P] 创建请求参数校验中间件，统一校验 `to_user_id`、`duration_seconds`、`family_id`、`page/pageSize` in `backend/src/middleware/validators.js`
- [X] T034 在家庭空间路由接入参数校验中间件，统一 400 错误返回结构 in `backend/src/routes/familySpace.js`
- [X] T035 [P] 创建启动环境校验模块，缺失 `DB/JWT/OSS` 关键配置时阻止启动 in `backend/src/config/env.js`
- [X] T036 在服务入口接入环境校验与优雅关闭（释放 MySQL 连接池） in `backend/server.js`
- [X] T037 [P] 编写家庭空间 OpenAPI/Swagger 文档，覆盖 6 个接口与 Bearer 鉴权 in `backend/src/docs/familySpaceSwagger.js`
- [X] T038 更新测试脚本，支持一键执行家庭空间集成测试 in `backend/package.json`
- [X] T039 编写家庭空间留言列表性能测试，GET /family/message/list 在200并发下 p95 <300ms in `backend/tests/performance/familySpace.messageList.perf.test.js`

---

## 依赖与执行顺序

```text
阶段 1:
T001 -> T002, T003 (可并行) -> T004

阶段 2:
T004 -> T005, T006, T007, T008, T009 (可并行) -> T010 -> T011 -> T012 -> T013 -> T014

US1:
T014, T010, T011 -> T015 -> T016, T017 -> T018 -> T019 -> T020

US2:
T019 -> T021 -> T022, T023 -> T024 -> T025 -> T026

US3:
T025 -> T027 -> T028, T029 -> T030 -> T031 -> T032

Final:
T032 -> T033, T035, T037 (可并行) -> T034, T036, T038
```

---

## 并行执行示例

**阶段 1 并行组（完成 T001 后）**
```text
T002 (backend/.env.example) || T003 (backend/src/config/db.js)
```

**阶段 2 并行组（完成 T004 后）**
```text
T005 (migration SQL) || T006 (auth.js) || T007 (errorHandler.js) || T008 (upload.js) || T009 (oss.js)
```

**Final 并行组（完成 T032 后）**
```text
T033 (validators.js) || T035 (env.js) || T037 (familySpaceSwagger.js)
```

---

## 任务统计

| 阶段 | 任务数 |
|---|---:|
| 阶段 1: 初始化 | 4 |
| 阶段 2: 基础设施 | 10 |
| 阶段 3: US1 - 语音留言（发送/列表） | 6 |
| 阶段 4: US2 - 电子相册（上传/列表） | 6 |
| 阶段 5: US3 - 孝心值系统（查询/排行榜） | 6 |
| 最终阶段: 完善 | 7 |
| **总任务数** | **39** |

- 阶段数：6
- 并行任务（标记 [P]）数量：10
- 用户故事任务数量（标记 [USn]）：18
