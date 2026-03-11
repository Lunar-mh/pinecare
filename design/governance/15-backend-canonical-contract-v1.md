# 银伴后端 Canonical Contract V1

## 目的

这份文档记录当前已经冻结的后端联调口径，供后续 Gemini3、Claude 和人工开发统一消费。
它不是完整 OpenAPI 的替代品，而是竞赛联调阶段的高优先级契约摘要。

## 当前冻结范围

- 链路 A
  - `GET /health-archive/today`
  - `GET /medication/today`
  - `POST /medication/confirm`
- 链路 B
  - `POST /sos/trigger`
  - `POST /sos/cancel`
  - `GET /sos/history`
  - `POST /sos/confirm`
  - `POST /sos/resolve`
  - `GET /community/sos/events`
  - `PATCH /community/sos/events/:eventId/status`
- 链路 C
  - `GET /family/bindings`
  - `GET /family/elderly-overview`
  - `GET /gps/current`
  - `GET /gps/trail`

## 社区后台正式归口

以下接口已经作为后台业务的正式消费面归口到 `/community/*`：

- `GET /community/health/overview`
- `GET /community/medication/logs`
- `PUT /community/medication/logs/:logId/status`
- `GET /community/gps/current`
- `GET /community/gps/trail`
- `GET /community/family/bindings`
- `GET /community/sos/events`
- `PATCH /community/sos/events/:eventId/status`
- `GET /community/medical/reports`
- `GET /community/fall/events`
- `GET /community/drug-interactions`
- `PUT /community/drug-interactions/:interactionId/status`
- `GET /community/time-bank/service/history`
- `POST /community/time-bank/service/confirm`
- `GET /community/time-bank/exchange/history`
- `GET /community/time-bank/leaderboard`

## 家属守护总览

`GET /family/elderly-overview`

查询参数：

- `elderId`：可选，正整数；不传时返回当前家属的 primary binding

固定返回一级块：

- `elderProfile`
- `todayHealthSummary`
- `medicationSummary`
- `locationSummary`
- `alerts`
- `interactionEvidenceSummary`

## SOS 状态机

人工流转只允许：

- `triggered -> confirmed`
- `confirmed -> resolved`
- `triggered -> cancelled`

不允许：

- `triggered -> resolved` 的人工直接跳转
- `resolved` 或 `cancelled` 再进入其他状态

## 统一字段约束

- 对外字段统一使用 camelCase
- 列表分页统一使用 `pagination: { page, pageSize, total, totalPages }`
- 时间字段统一使用 ISO 8601 文本
- 第三方结果必须显式标注 `source`、`mode`、`fallbackUsed`

## 后台边界说明

- `/community/*` 是后台业务管理的正式消费面
- `/admin/system/*` 是系统级诊断、审计和 demo 的正式消费面
- `/admin/*` 下的业务入口暂时保留，但已经进入废弃流程，并会通过 deprecation header 指向 `/community/*`

## 当前过渡说明

- `/statistics` 仍保留，但不再作为新前端联调目标
- `/timebank`、`/location`、`/companion` 仍处于过渡期，后续按阶段计划清理
- 新增联调或 AI 生成代码时，应优先使用本文列出的 canonical routes
