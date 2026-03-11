# 银伴后端 Canonical Contract V1

## 目的

这份文档记录本轮已经开始冻结的后端联调口径，供后续 Gemini3、Claude 和人工开发统一消费。它不是完整 OpenAPI 替代品，而是竞赛联调阶段的最高优先级契约摘要。

## 当前冻结范围

- 链路 A：
  - `GET /health-archive/today`
  - `GET /medication/today`
  - `POST /medication/confirm`
- 链路 B：
  - `POST /sos/trigger`
  - `POST /sos/cancel`
  - `GET /sos/history`
  - `POST /sos/confirm`
  - `POST /sos/resolve`
  - `GET /community/sos/events`
  - `PATCH /community/sos/events/:eventId/status`
- 链路 C：
  - `GET /family/bindings`
  - `GET /family/elderly-overview`
  - `GET /gps/current`
  - `GET /gps/trail`

## 家属守护总览

`GET /family/elderly-overview`

查询参数：

- `elderId`：可选，正整数；不传时返回当前家属的 primary binding

固定返回块：

- `elderProfile`
- `todayHealthSummary`
- `medicationSummary`
- `locationSummary`
- `alerts`
- `interactionEvidenceSummary`

## SOS 状态机

手动流转只允许：

- `triggered -> confirmed`
- `confirmed -> resolved`
- `triggered -> cancelled`

不允许：

- `triggered -> resolved` 的人工直接跳转
- `resolved` 或 `cancelled` 再次进入其他状态

## 统一字段约束

- 对外字段采用 camelCase
- 列表分页采用 `pagination: { page, pageSize, total, totalPages }`
- 时间字段采用 ISO 8601 文本
- 第三方或通知摘要类数据使用显式对象，不依赖前端二次拼装

## 当前过渡说明

- `/admin/*` 下的业务入口仍在，但不再作为新的正式消费目标
- `/community/*` 是后台业务管理的正式归口
- `/statistics`、`/timebank`、`/location`、`/companion` 仍处于过渡期，后续按阶段计划清理
