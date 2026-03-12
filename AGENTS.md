# 银伴全域智慧照护平台 — 项目知识库

**更新时间**: 2026-03-12  
**定位**: 四端 non-live release candidate（stub-ready / live-ready）

## 概述

银伴是一个面向老年人的全域智慧照护平台，采用 Monorepo 组织，当前包含四个可构建端：
- `backend/`: Express REST API，15 个功能模块，统一诊断、统一事件流、统一第三方运行态
- `frontend/`: Taro 微信小程序用户端，默认 API 基线 `http://127.0.0.1:3001/api/v1`
- `admin/`: Vue 3 管理后台，默认 API 基线 `http://127.0.0.1:3001`
- `volunteer/`: 志愿者执行端，默认 API 基线 `http://127.0.0.1:3001/api/v1`

当前仓库已经收口到“只差真实密钥与真实上游接入”的状态。项目对外口径统一为 `stub-ready / live-ready`，不把受控 fallback 表述成已商用的 live 能力。

## 技术栈

- 后端：Node.js 18、Express 4、MySQL 8、Redis 7、mysql2、ioredis、jsonwebtoken、node-cron
- 小程序：Taro 4、React 18、TypeScript
- 管理端：Vue 3、Vite 7、TypeScript、Element Plus
- 志愿者端：Vanilla JS，接口驱动执行端
- 第三方能力：阿里云短信/OSS、DashScope、讯飞 ASR/TTS、微信通知、高德地图、医疗平台 stub/live-ready 适配

## 目录结构

```text
old/
├── backend/          # Express API + tests + migrations + docs
├── frontend/         # Taro 微信小程序用户端
├── admin/            # Vue 3 管理后台
├── volunteer/        # 志愿者执行端
├── specs/            # 001-015 模块规格与 OpenAPI
├── design/           # 设计稿与组件规范
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## 查找导航

| 任务 | 位置 |
|------|------|
| 新增后端接口 | `backend/src/routes/` → `controllers/` → `services/` → `models/` |
| 后端统一挂载 | `backend/src/routes/index.js` |
| 第三方运行态与证据 | `backend/src/services/adminOps/adminDiagnostics/`、`backend/src/utils/providerRuntime.js` |
| 统一事件复盘 | `backend/src/services/eventTimelineService.js`、`backend/src/services/adminOps/eventReplayService.js` |
| 数据迁移 | `backend/migrations/`，执行 `npm run migrate` |
| fresh install / seed smoke | `backend/scripts/freshInstallSmoke.js`、`backend/scripts/verifyCompetitionSeed.js` |
| 小程序 API 封装 | `frontend/src/services/request.ts` |
| 管理端 API 封装 | `admin/src/services/api.ts` |
| 志愿者端 API 基线 | `volunteer/src/app.js` |
| release / 合规 / live 交接文档 | `backend/docs/` |
| CI | `.github/workflows/ci.yml` |

## 15 个功能模块

| 编号 | 模块 | 后端路由前缀 | 小程序分包 |
|------|------|-------------|-----------|
| 001 | 用户认证 | `/auth` `/user` | `pages/login` |
| 002 | 健康档案 | `/health-archive` | `subpackages/health` |
| 003 | 用药提醒 | `/medication` | `subpackages/medication` |
| 004 | 紧急 SOS | `/sos` | `subpackages/sos` |
| 005 | 家属应用 | `/family` | — |
| 006 | 语音交互 | `/voice` | `subpackages/voice_ai` |
| 007 | 跌倒检测 | `/fall-detection` | — |
| 008 | AI 健康咨询 | `/ai-consult` | `subpackages/ai_consult` |
| 009 | 药物相互作用 | `/drug-interaction` | `subpackages/drug_check` |
| 010 | 时间银行 | `/time-bank` | `subpackages/timebank` |
| 011 | AI 伴聊 | `/ai-companion` | `subpackages/ai_companion` |
| 012 | 家庭空间 | `/family-space` | `subpackages/family_space` |
| 013 | 社区管理 | `/community` | — |
| 014 | GPS 追踪 | `/gps` | `subpackages/location` |
| 015 | 医疗资源整合 | `/medical` | `subpackages/medical` |

## 统一规范

**响应格式**：所有接口都返回 `{ code, message, data }`
- 成功 `code: 0`
- 失败 `code` 取 HTTP 语义值，如 `400/401/404/409/422/429/503/504`
- 统一使用 `backend/src/utils/response.js` 的 `ok()` / `fail()`，不要直接裸用 `res.json()`

**分层约束**：
- Controller 只调 Service
- Service 只调 Model
- Model 才允许访问 `database.js`

**错误处理**：
- Service 层抛业务错误时设置 `err.code` / `err.statusCode`
- Controller 用统一 `handleError` 映射到标准响应

**双前缀挂载**：
- `app.use('/api/v1', routes)`
- `app.use('/', routes)`

**第三方能力口径**：
- 统一输出 `requestedMode`、`effectiveMode`、`liveConfigured`、`fallbackAllowed`、`lastError`、`lastSuccessAt`
- 当前官方叙事统一为 `stub-ready / live-ready`

## 默认环境口径

- Docker 演示基线：`http://127.0.0.1:3001`
- 小程序默认 API：`http://127.0.0.1:3001/api/v1`
- 管理端默认 API：`http://127.0.0.1:3001`
- 志愿者端默认 API：`http://127.0.0.1:3001/api/v1`
- 宿主机 MySQL 演示口径：`127.0.0.1:13307`
- 宿主机直连 `3000` 仅保留为显式环境变量覆盖方案，不再作为默认值

## 命令速查

```bash
# backend
cd backend && npm run lint
cd backend && npm test
cd backend && npm run migrate
cd backend && npm run smoke:fresh-install
cd backend && npm run seed:competition:verify -- --dry-run

# frontend
cd frontend && npm run typecheck
cd frontend && npm run build:weapp

# admin
cd admin && npm run build

# volunteer
cd volunteer && npm run typecheck
cd volunteer && npm run build

# docker
cd . && docker compose up -d mysql backend
```

## CI / 质量门槛

- CI 当前会校验 backend、frontend、admin、volunteer 四端
- backend 使用 `npm ci`、`lint`、`test`、`smoke:fresh-install`、`seed:competition:verify -- --dry-run`
- frontend 运行 `typecheck` 和 `build:weapp`
- admin 运行 `build`
- volunteer 运行 `typecheck` 和 `build`
- backend 覆盖率门槛：`Statements >= 80`、`Branches >= 60`、`Functions >= 80`、`Lines >= 80`

## 当前叙事边界

- 医疗、通知、语音、OSS：已完成模式治理、证据链和 live-ready 交接准备，真实凭据接入后可切 live
- `competition seed`：演示基线数据，不表述为线上真实业务数据
- Neo4j：当前 release candidate 中不作为核心能力叙事；只有在真实接通并进入统一诊断后，才重新纳入亮点

## 注意事项

- `backend/src/config/db.js` 只是 `database.js` 别名
- 医疗目录、预约、报告仍保留受控 fallback，但所有 fallback 都要求可见、可解释、可审计
- 小程序构建目前存在一个非阻塞 CSS order warning，已在 release note 中标记为已知项，不影响产物和答辩演示
- 若本机 `backend/.env` 仍覆盖旧端口，dry-run 输出会显示本机覆盖值；仓库模板默认已统一为 `13307`
