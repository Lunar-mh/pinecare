# Quickstart: 社区管理模块

本文档用于快速理解 `013-community-admin` 当前与真实后端实现对齐后的使用方式。

## 1. 目标

社区管理模块用于支撑以下能力：

- 社区志愿者查看
- 服务工单创建、详情、分派与状态收口
- 社区活动管理
- 社区统计摘要

## 2. 关键路由前缀

当前真实路由前缀为：

- `/community/*`

同时支持：

- `/api/v1/community/*`

历史 `/admin/*` 口径已废弃，不应再用于新的开发和文档描述。

## 3. 关键接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/community/volunteers` | 社区志愿者列表 |
| GET | `/community/orders` | 工单列表 |
| POST | `/community/orders` | 创建工单 |
| GET | `/community/orders/:orderId` | 工单详情 |
| PATCH | `/community/orders/:orderId/assign` | 分派志愿者 |
| PATCH | `/community/orders/:orderId/status` | 后台收口状态 |
| GET | `/community/activities` | 活动列表 |
| POST | `/community/activities` | 创建活动 |
| GET | `/community/stats` | 社区统计 |

## 4. 工单状态说明

当前工单闭环状态如下：

- `pending`：新建待分派
- `assigned`：已分派给志愿者
- `processing`：志愿者已签到，正在执行
- `completed`：已完成
- `cancelled`：后台人工关闭

## 5. 与志愿者端的协同

社区管理模块与志愿者工作台共享同一套工单数据：

1. 社区后台创建工单
2. 社区后台分派工单
3. 志愿者接单、签到、签退、完成
4. 后台列表、详情、统计和审计同步可见

## 6. 联调建议

联调时建议优先走下面的最小路径：

1. `POST /community/orders`
2. `PATCH /community/orders/:orderId/assign`
3. `GET /volunteer/tasks`
4. `POST /volunteer/tasks/:taskId/check-in`
5. `POST /volunteer/tasks/:taskId/complete`
6. `GET /admin/system/audit-logs`
