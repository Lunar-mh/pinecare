# backend/ — 银伴后端知识库

**更新时间**: 2026-03-12  
**状态**: non-live release candidate（stub-ready / live-ready）

## 概述

`backend/` 是银伴平台的 Express REST API，当前覆盖 15 个业务模块，并已收口到“只差真实凭据和真实上游”的阶段。后端具备以下统一能力：
- 双前缀路由：`/api/v1` 与 `/`
- 统一响应与错误语义
- 统一第三方运行态与证据接口
- 统一 care event 审计与事件复盘
- fresh install / migration / competition seed smoke

## 关键目录

```text
backend/
├── server.js
├── src/
│   ├── app.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── jobs/
│   └── utils/
├── migrations/
├── scripts/
├── tests/
└── docs/
```

## 分层约束

- Controller 只能调用 Service，不直接查库
- Service 只能调用 Model，不直接使用 `database.query()`
- Model 是唯一允许访问 `database.js` 的层
- `systemHealthService` is a documented diagnostics exception，可直接查库用于健康检查与可观测诊断
- 签名、鉴权、回执生成禁止使用默认密钥回退；缺配置必须 fail-closed
- 统一响应用 `src/utils/response.js` 的 `ok()` / `fail()`
- 统一错误通过 `handleError` 或 `controllerError` 映射到响应格式

## 重要模式

### 双前缀路由

```js
app.use('/api/v1', routes);
app.use('/', routes);
```

### safeUse 路由装配

在 `src/routes/index.js` 中使用 `safeUse('/module', './module')`，路由缺失时静默跳过，不让启动崩溃。

### 第三方运行态

所有 live/stub 能力应尽量统一输出：
- `requestedMode`
- `effectiveMode`
- `liveConfigured`
- `fallbackAllowed`
- `lastError`
- `lastSuccessAt`
- 成功/失败计数

对外叙事统一使用 `stub-ready / live-ready`，不要把 fallback 能力表述为稳定商用 live。

### 统一事件证据

以下链路已经进入统一 care event / replay 体系：
- SOS
- 跌倒
- GPS
- 通知发送
- 社区处置
- 志愿者接单与执行

答辩期优先复用：
- `/admin/system/integrations`
- `/admin/system/evidence`
- `/admin/system/event-replay`
- `/readyz`
- `/livez`

## 默认环境口径

- 后端对外基线：`http://127.0.0.1:3001`
- 宿主机 MySQL：`127.0.0.1:13307`
- 宿主机直连 `3000` 只作为显式覆盖方案保留
- `.env.example` 和 `.env.production-live.example` 是默认模板

## 常用命令

```bash
npm run lint
npm test
npm run migrate
npm run smoke:fresh-install
npm run seed:competition:verify -- --dry-run
```

需要本地 Docker 演示环境时：

```bash
docker compose up -d mysql backend
```

## 当前质量门槛

Jest 覆盖率门槛已提升为：
- Statements >= 80
- Branches >= 60
- Functions >= 80
- Lines >= 80

后端 release candidate 的最低要求：
- `npm run lint` 通过
- `npm test` 通过
- `npm run smoke:fresh-install` 返回 `status: ready`
- `npm run seed:competition:verify -- --dry-run` 返回 `status: ready`
- `npm run migrate` 在标准环境下通过

## 当前叙事边界

- 医疗资源整合：目录、预约、报告都已完成模式治理和证据链，但真实上游仍待凭据接入
- 微信通知、短信、语音、OSS：统一纳入 live/stub 诊断，但 non-live 阶段不宣称已经商用 live
- `competition seed`：演示基线数据
- Neo4j：当前保持 no-op 占位，不作为比赛亮点；除非未来接成真实能力并纳入诊断，否则继续从主叙事中移除

## 关键文档

- `docs/four-end-release-candidate.md`
- `docs/deployment-playbook.md`
- `docs/compliance-and-contest-package.md`
- `docs/real-data-evidence-pack.md`
- `docs/live-cutover-handover.md`
- `docs/live-evidence-templates.md`
- `docs/release-known-issues.md`
- `docs/error-message-spec.md`

## 注意事项

- `src/config/db.js` 是 `database.js` 别名
- medical stub/fallback 必须可见、可解释、可审计
- 任何新增字段只能向后兼容追加，不能破坏现有响应结构
- 如果开发者本地 `.env` 仍残留旧端口覆盖，dry-run 输出可能显示本地值；仓库默认模板已经统一为 `13307`
- Backend `message` 统一使用英文调试语义；端侧必须通过 `code/statusCode` 做本地化
