# 任务清单: 用户注册与身份认证 (001-user-auth)

**功能**: 用户注册与身份认证 | **分支**: `001-user-auth`
**范围**: 仅后端 (`backend/`) — 前端已完成 | **任务总数**: 50

---

## 可追溯约定
- 本文件内标记 `[USn]` 的任务，对应 `.specify/specs/001-user-auth/spec.md` 中的“用户故事 n”
- 未标记 `[USn]` 的任务为基础设施/横切关注点（鉴权、错误处理、迁移、文档、测试等）
- 本模块任务以“后端实现”为范围；spec.md 中的前端体验指标（字号、按钮尺寸、步骤数等）用于验收与设计约束，不在本 tasks 内重复实现


## 阶段 1: 初始化

- [X] T001 初始化后端工程依赖与脚本（express/mysql2/ioredis/jsonwebtoken/bcrypt/dotenv/axios，start/dev 脚本） in `backend/package.json`
- [X] T002 创建后端目录骨架（src/{config,controllers,middleware,models,routes,services,utils}、migrations、tests） in `backend/src/`
- [X] T003 [P] 创建环境变量模板，补齐 DB/REDIS/JWT/WX/SMS/PORT 配置项 in `backend/.env.example`
- [X] T004 创建服务启动入口，加载 dotenv、启动 HTTP 服务并预留优雅关闭钩子 in `backend/server.js`

---

## 阶段 2: 基础设施

- [X] T005 [P] 创建 MySQL 连接池与 query 封装，统一处理连接错误和超时 in `backend/src/config/database.js`
- [X] T006 [P] 创建 Redis 客户端配置，支持连接重试与错误日志 in `backend/src/config/redis.js`
- [X] T007 [P] 创建环境变量校验工具，缺失关键变量时启动失败并提示字段名 in `backend/src/utils/validateEnv.js`
- [X] T008 [P] 创建参数校验工具，封装手机号/验证码/密码/分页与通用必填校验 in `backend/src/utils/validators.js`
- [X] T009 [P] 创建全局错误处理中间件，统一输出 `{code, message, data}` 并区分业务错误与系统错误 in `backend/src/middleware/errorHandler.js`
- [X] T010 [P] 创建 JWT 鉴权中间件，解析 Bearer Token 并注入 `req.user.userId` in `backend/src/middleware/auth.js`
- [X] T011 创建短信发送限流中间件（按 IP + 手机号限流，超限返回 429） in `backend/src/middleware/rateLimiter.js`
- [X] T012 [P] 创建认证路由骨架并预留 send-sms/register/login/refresh/wechat 路由位 in `backend/src/routes/auth.js`
- [X] T013 [P] 创建用户路由骨架并预留 profile/contact/binding/account/unlock 路由位 in `backend/src/routes/user.js`
- [X] T014 创建路由聚合入口并挂载 `/auth` 与 `/user` 模块 in `backend/src/routes/index.js`
- [X] T015 创建 Express app 初始化文件，注册 json 解析、路由与 errorHandler in `backend/src/app.js`
- [X] T016 [P] 编写首个迁移脚本，创建 users/emergency_contacts/family_bindings/sms_codes/audit_logs 五张表与索引 in `backend/migrations/001_create_user_auth_tables.sql`

---

## 阶段 3：用户故事 1 — 手机号注册与登录 (P1, MVP)

**目标**: 实现手机号验证码发送、手机号注册、手机号密码登录、刷新令牌完整闭环。
**独立验证标准**:
1) `POST /auth/send-sms` 返回 `{code:0,message:"验证码已发送",data:null}`;
2) `POST /auth/register/phone` 返回 `{code:0,message:"ok",data:{access_token,refresh_token,expires_in,user}}`;
3) `POST /auth/login/phone` 正确密码返回 `{code:0,message:"ok",data:{access_token,refresh_token,expires_in,user}}`，连续 5 次错误后返回 HTTP 423 + `{code:423,message:"账户已锁定",data:{locked_until}}`;
4) `POST /auth/refresh-token` 返回 `{code:0,message:"ok",data:{access_token,expires_in}}`.

- [X] T017 [P] [US1] 创建用户模型，封装按手机号查询、手机号创建、登录成功重置计数、登录失败计数递增等方法 in `backend/src/models/user.js`
- [X] T018 [P] [US1] 创建短信验证码模型，封装验证码记录写入、标记已使用、按用途查询最近记录方法 in `backend/src/models/smsCode.js`
- [X] T019 [P] [US1] 创建审计日志模型，封装通用审计写入方法 in `backend/src/models/auditLog.js`
- [X] T020 [US1] 实现短信服务：生成 6 位验证码、写入 Redis `sms:code:{phone}:{purpose}`(5 分钟)、统计 `sms:count:{phone}:{date}`(每日 10 次) 并落库 in `backend/src/services/smsService.js`
- [X] T021 [US1] 实现认证服务核心流程：手机号注册、手机号登录、Refresh Token 存储 Redis 与轮换（Access 15 分钟/Refresh 7 天） in `backend/src/services/authService.js`
- [X] T022 [US1] 在认证服务中实现账户锁定策略：连续 5 次登录失败锁定 30 分钟并输出 locked_until in `backend/src/services/authService.js`
- [X] T023 [US1] 实现认证控制器 sendSms/registerPhone/loginPhone/refreshToken，统一返回 `{code,message,data}` in `backend/src/controllers/authController.js`
- [X] T024 [US1] 在认证路由注册 `POST /auth/send-sms`、`POST /auth/register/phone`、`POST /auth/login/phone`、`POST /auth/refresh-token` 并接入校验/限流 in `backend/src/routes/auth.js`

---

## 阶段 4：用户故事 2 — 微信一键登录 (P2)

**目标**: 支持微信 code 换取 openid 并完成自动注册/登录与令牌签发。
**独立验证标准**: `POST /auth/login/wechat` 传入 `{code,userInfo}` 后返回 `{code:0,message:"ok",data:{access_token,refresh_token,expires_in,user}}`，且不返回 `session_key`.

- [X] T025 [US2] 扩展用户模型，增加按 openid 查询、微信首登创建、微信资料更新方法 in `backend/src/models/user.js`
- [X] T026 [US2] 实现微信服务，调用 `https://api.weixin.qq.com/sns/jscode2session` 并解析 openid/session_key in `backend/src/services/wechatService.js`
- [X] T027 [US2] 在认证服务实现 loginWithWechat：code2Session、用户匹配/创建、签发 JWT、记录审计 in `backend/src/services/authService.js`
- [X] T028 [US2] 扩展认证控制器 loginWechat 处理器并映射微信错误码为统一业务响应 in `backend/src/controllers/authController.js`
- [X] T029 [US2] 在认证路由注册 `POST /auth/login/wechat` 并接入请求参数校验 in `backend/src/routes/auth.js`

---

## 阶段 5：用户故事 3 — 用户信息与紧急联系人管理 (P3)

**目标**: 支持用户查看/更新档案，并管理紧急联系人列表。
**独立验证标准**:
1) `GET /user/profile` 返回 `{code:0,message:"ok",data:{id,phone,real_name,age,gender,chronic_diseases,...}}`;
2) `PUT /user/profile` 返回 `{code:0,message:"ok",data:{...更新后资料...}}`;
3) `GET /user/emergency-contacts` 返回 `{code:0,message:"ok",data:[...]}`;
4) `POST /user/emergency-contacts` 返回 `{code:0,message:"ok",data:{id,...}}`;
5) `DELETE /user/emergency-contacts/:id` 返回 `{code:0,message:"ok",data:null}`.

- [X] T030 [P] [US3] 扩展用户模型，增加当前用户资料查询与资料更新方法（real_name/age/gender/chronic_diseases） in `backend/src/models/user.js`
- [X] T031 [P] [US3] 创建紧急联系人模型，封装按用户查询、新增、按用户删除方法 in `backend/src/models/emergencyContact.js`
- [X] T032 [US3] 实现用户服务 getProfile/updateProfile/listEmergencyContacts/createEmergencyContact/deleteEmergencyContact（含归属校验） in `backend/src/services/userService.js`
- [X] T033 [US3] 实现用户控制器 profile 与 emergency-contacts 全部处理器并统一响应结构 in `backend/src/controllers/userController.js`
- [X] T034 [US3] 在用户路由注册 `GET/PUT /user/profile`、`GET/POST /user/emergency-contacts`、`DELETE /user/emergency-contacts/:id` 并接入 auth 中间件 in `backend/src/routes/user.js`

---

## 阶段 6：用户故事 4 — 家属绑定 (P4)

**目标**: 支持老人生成绑定二维码并处理家属绑定申请（同意/拒绝）。
**独立验证标准**:
1) `POST /user/binding/qrcode` 返回 `{code:0,message:"ok",data:{qr_code,expire_at}}` 且有效期 15 分钟;
2) `POST /user/binding/approve` 返回 `{code:0,message:"ok",data:{binding_id,binding_status}}`.

- [X] T035 [US4] 创建家属绑定模型，封装二维码绑定记录创建、按二维码查询、审批状态更新方法 in `backend/src/models/familyBinding.js`
- [X] T036 [US4] 扩展用户服务，实现 binding qrcode 生成（15 分钟过期）与 approve/reject 审批流程 in `backend/src/services/userService.js`
- [X] T037 [US4] 扩展用户控制器 createBindingQrcode/approveBinding 处理器并校验绑定状态流转 in `backend/src/controllers/userController.js`
- [X] T038 [US4] 在用户路由注册 `POST /user/binding/qrcode` 与 `POST /user/binding/approve`（鉴权必需） in `backend/src/routes/user.js`

---

## 阶段 7：用户故事 5 — 账户安全 (P5)

**目标**: 支持验证码解锁与账户注销，形成完整账号安全闭环。
**独立验证标准**:
1) 锁定账户调用 `POST /user/unlock`（phone+code）返回 `{code:0,message:"ok",data:{account_status:"active"}}`;
2) 登录后调用 `POST /user/account/delete`（code）返回 `{code:0,message:"ok",data:null}`，并将账户标记为 `deleted`;
3) 已删除账户再次登录返回业务失败响应（`code` 为 4xx）.

- [X] T039 [US5] 扩展用户模型，增加账户软删除、清空失败计数、解锁状态恢复方法 in `backend/src/models/user.js`
- [X] T040 [US5] 扩展短信验证码模型，增加按手机号+用途校验并消费验证码方法 in `backend/src/models/smsCode.js`
- [X] T041 [US5] 扩展认证服务，实现 `unlockAccountByCode(phone, code)` 解锁流程并写入审计 in `backend/src/services/authService.js`
- [X] T042 [US5] 扩展用户服务，实现 `deleteAccountByCode(userId, code)`（置 `account_status=deleted` + 回收 Redis refresh token） in `backend/src/services/userService.js`
- [X] T043 [US5] 扩展用户控制器 deleteAccount/unlockAccount 处理器并映射 401/423 等错误 in `backend/src/controllers/userController.js`
- [X] T044 [US5] 在用户路由注册 `POST /user/account/delete`（需鉴权）与 `POST /user/unlock`（免鉴权） in `backend/src/routes/user.js`

---

## 最终阶段：完善

- [X] T045 [P] 创建统一响应工具，封装 `ok()`/`fail()` 以强制 `{code,message,data}` 输出 in `backend/src/utils/response.js`
- [X] T046 将认证控制器全面切换为 response 工具输出，并统一 200/400/401/423/429 响应语义 in `backend/src/controllers/authController.js`
- [X] T047 将用户控制器全面切换为 response 工具输出，并统一 200/400/401/403/404 响应语义 in `backend/src/controllers/userController.js`
- [X] T048 [P] 在认证服务接入审计日志（send_sms/register/login_success/login_fail/refresh/wechat_login） in `backend/src/services/authService.js`
- [X] T049 [P] 在用户服务接入审计日志（profile_update/contact_manage/binding_approve/account_delete/unlock） in `backend/src/services/userService.js`
- [X] T050 启动前执行环境校验并完善优雅关闭流程（关闭 MySQL/Redis 连接） in `backend/server.js`
- [X] T051 编写认证接口性能测试，POST /auth/login/phone 在100并发下 p95 <500ms in `backend/tests/performance/auth.perf.test.js`

---

## 依赖与执行顺序

```
T001 → T002 → T003, T004 (可并行)
T002 → T005, T006, T007, T008, T009, T010, T016 (可并行)
T006 → T011
T002 → T012, T013 (可并行) → T014 → T015

[US1] T005, T006, T010, T011, T012, T016 → T017, T018, T019 (可并行) → T020 → T021 → T022 → T023 → T024
[US2] T024 → T025 → T026 → T027 → T028 → T029
[US3] T013, T024 → T030, T031 (可并行) → T032 → T033 → T034
[US4] T034 → T035 → T036 → T037 → T038
[US5] T024, T034, T018 → T039, T040 (可并行) → T041, T042 (可并行) → T043 → T044

[Final] T045 → T046, T047 (可并行)
[Final] T019, T022, T029 → T048
[Final] T019, T038, T044 → T049
[Final] T007, T015, T005, T006 → T050
```

---

## 并行执行示例

**阶段 2 并行组（完成 T002 后）**
```
T005 (database.js) || T006 (redis.js) || T007 (validateEnv.js) || T008 (validators.js) || T009 (errorHandler.js) || T010 (auth.js) || T016 (migration)
```

**US1 并行组（完成基础设施后）**
```
T017 (user.js) || T018 (smsCode.js) || T019 (auditLog.js)
```

**US3 并行组**
```
T030 (user.js) || T031 (emergencyContact.js)
```

**US5 并行组（完成 T039 + T040 后）**
```
T041 (authService.js) || T042 (userService.js)
```

**Final 并行组**
```
T046 (authController.js) || T047 (userController.js)
T048 (authService.js) || T049 (userService.js)
```

---

## 任务统计

| 分类 | 任务数 |
|---|---:|
| 阶段 1 初始化 | 4 |
| 阶段 2 基础设施 | 12 |
| US1 (P1, MVP) | 8 |
| US2 (P2) | 5 |
| US3 (P3) | 5 |
| US4 (P4) | 4 |
| US5 (P5) | 6 |
| 最终阶段 完善 | 7 |
| **总任务数** | **51** |

| 用户故事 | 任务数 |
|---|---:|
| US1 | 8 |
| US2 | 5 |
| US3 | 5 |
| US4 | 4 |
| US5 | 6 |
| **用户故事任务总数** | **28** |
