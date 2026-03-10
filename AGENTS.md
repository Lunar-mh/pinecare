# 银伴全域智慧照护平台 — 项目知识库

**生成时间**: 2026-02-26  **提交**: 944dafe2  **分支**: main

## 概述

面向老年人的全域照护平台（银伴）。三端分离 Monorepo：Express REST API（`backend/`）、Taro 微信小程序用户端（`frontend/`）、Vue 3 管理后台（`admin/`）。15 个功能模块，规格文档在 `specs/`。

**核心技术栈**
- 后端：Node.js 18 · Express 4 · MySQL 8 · Redis 7 · mysql2 · ioredis · jsonwebtoken · node-cron
- 前端：Taro 4 · React 18 · TypeScript · 微信小程序
- 后台：Vue 3 · Vite 7 · TypeScript
- 外部服务：阿里云SMS/OSS · 阿里云DashScope(AI) · 讯飞ASR/TTS · 高德地图 · 微信服务通知

## 项目结构

```
old/
├── backend/          # Express API — MVC 分层，15 模块路由
│   ├── src/          # 源码（controllers / services / models / middleware / jobs / utils）
│   ├── tests/        # 集成测试 + 性能测试 + 契约测试
│   ├── migrations/   # SQL 迁移脚本（001-029+）
│   └── server.js     # 启动入口
├── frontend/         # Taro 微信小程序用户端
│   └── src/          # pages（4主页）+ subpackages（11分包）+ services + components/elderly
├── admin/            # Vue 3 管理后台（脚手架，待扩展）
├── specs/            # 功能模块规格文档（001-015，含 OpenAPI yaml）
├── design/           # 设计稿、组件规范、Token
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## 查找导航

| 任务 | 位置 |
|------|------|
| 新增后端接口 | `backend/src/routes/` → `controllers/` → `services/` → `models/` |
| 后端路由注册 | `backend/src/routes/index.js`（safeUse 安全挂载）|
| 数据库迁移 | `backend/migrations/`，执行 `npm run migrate` |
| 定时任务 | `backend/src/jobs/`（用药提醒、续药等）|
| 环境变量配置 | `backend/.env.example`（完整模板，含所有第三方服务）|
| 前端页面 | `frontend/src/pages/`（4主页）/ `frontend/src/subpackages/`（11分包）|
| 前端 HTTP 封装 | `frontend/src/services/request.ts` |
| 前端类型定义 | `frontend/src/services/types.ts` |
| 老年人 UI 组件 | `frontend/src/components/elderly/`（大字体、无障碍组件）|
| 功能模块规格 | `specs/<编号>-<名称>/`（plan.md / spec.md / tasks.md / openapi.yaml）|
| CI/CD | `.github/workflows/ci.yml`，仅运行测试，Docker build 已禁用（if: false）|

## 15 个功能模块

| 编号 | 模块 | 后端路由前缀 | 前端分包 |
|------|------|-------------|---------|
| 001 | 用户认证 | `/auth` `/user` | pages/login |
| 002 | 健康档案 | `/health-archive` | subpackages/health |
| 003 | 用药提醒 | `/medication` | subpackages/medication |
| 004 | 紧急SOS | `/sos` | subpackages/sos |
| 005 | 家属应用 | `/family` | — |
| 006 | 语音交互 | `/voice` | subpackages/voice_ai |
| 007 | 跌倒检测 | `/fall-detection` | — |
| 008 | AI健康咨询 | `/ai-consult` | subpackages/ai_consult |
| 009 | 药物相互作用 | `/drug-interaction` | subpackages/drug_check |
| 010 | 时间银行 | `/time-bank` | subpackages/timebank |
| 011 | AI伴聊 | `/ai-companion` | subpackages/ai_companion |
| 012 | 家庭空间 | `/family-space` | subpackages/family_space |
| 013 | 社区管理 | `/community` | — |
| 014 | GPS追踪 | `/gps` | subpackages/location |
| 015 | 医疗资源整合 | `/medical` | subpackages/medical |

## 统一规范

**响应格式**（所有接口强制）：`{ code: 0|错误码, message: string, data: any }`
- 成功：`code: 0`；失败：`code` 等于 HTTP 状态码（400/401/404/409/422/429/503/504）
- 使用 `utils/response.js` 的 `ok(res, data)` / `fail(res, code, msg)`，禁止裸用 `res.json()`

**命名约定**：
- JS/TS 文件：camelCase（`userService.js`）
- 数据库字段：snake_case（`user_id`、`created_at`）
- 路由路径：kebab-case（`/health-archive`）

**分层约束**（严格遵守）：
- Controller → 调用 Service，不直接操作 Model/DB
- Service → 调用 Model，不直接 `query()` DB
- Model → 唯一可调用 `database.js` 的层

## 关键实现模式（非标准，必须遵守）

**双路由前缀**：后端同时挂载 `/api/v1` 和 `/`（小程序兼容）
```js
app.use('/api/v1', routes);
app.use('/', routes);  // 小程序端直接用无前缀
```

**safeUse 路由加载**：路由文件不存在时静默跳过（不崩溃）
```js
// routes/index.js — 新增模块时用此模式
safeUse('/your-module', './yourModule');
```

**业务错误抛出**（Service 层统一用法）：
```js
const err = new Error('用户不存在');
err.code = 404; err.statusCode = 404;
throw err;  // Controller handleError() 会自动转为 fail() 响应
```

**敏感字段脱敏**（来自015模块，全项目适用）：
- 身份证号日志仅保留前3位+后2位
- 第三方API密钥/会话链接不回显到前端错误提示

## 命令速查

```bash
# 后端
cd backend && npm run dev          # nodemon server.js（开发）
cd backend && npm start            # node server.js（生产）
cd backend && npm test             # Jest 全量测试 + coverage
cd backend && npm run migrate      # 执行 SQL 迁移

# 前端（微信小程序）
cd frontend && npm run dev:weapp   # 开发模式，用微信开发者工具打开 dist/weapp
cd frontend && npm run build:weapp # 生产构建
cd frontend && npm run typecheck   # TypeScript 类型检查

# 后台管理
cd admin && npm run dev            # Vite dev server
cd admin && npm run build          # 构建

# Docker（本地联调）
docker-compose up -d               # 启动 backend + mysql + redis
```

## 环境变量

复制 `backend/.env.example` → `backend/.env`，必填项：
- `DB_HOST/PORT/USER/PASSWORD/DB_NAME`、`REDIS_HOST/PORT`、`JWT_SECRET`
- JWT：Access Token 15min，Refresh Token 7天（Redis 存储）
- 第三方（按需）：`ALIYUN_SMS_*`、`WECHAT_APP_*`、`DASHSCOPE_API_KEY`、`IFLYTEK_*`、`AMAP_KEY`

## 注意事项

- `backend/src/config/db.js` 只是 `database.js` 的别名，两者等价
- CI 中 Docker build job 被 `if: false` 禁用，仅跑测试
- 测试覆盖率阈值：50%（branches/functions/lines）
- `backend/src/services/medicalApiService.js` 为第三方医疗平台 stub 实现，尚未对接真实API
- 无 ESLint / Prettier 配置，代码风格靠约定维护

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
