# 任务清单: 社区管理模块

本文档保留当前仍有价值的模块级任务说明，并与真实工程结构对齐。

## 当前后端已完成

- 社区管理模型、服务、控制器与路由已落地
- 社区志愿者列表接口已落地
- 工单列表、创建、详情、分派、状态收口接口已落地
- 活动列表与创建接口已落地
- 统计接口已落地
- 社区接口契约测试、集成测试和性能测试已存在

## 当前真实文件位置

- 路由：`backend/src/routes/community.js`
- 控制器：`backend/src/controllers/communityAdminController.js`
- 服务：`backend/src/services/communityAdminService.js`
- 模型：`backend/src/models/communityAdmin.js`
- 参数校验：`backend/src/middleware/validateCommunityAdmin.js`

## 当前剩余重点

### 后台前端联调

1. 社区工单分派界面接入真实 `/community/orders/:orderId/assign`
2. 工单详情页接入 `/community/orders/:orderId`
3. 今日工作台与统计页对齐 `/community/stats`

### 与志愿者端协同

1. 志愿者工作台使用 `/volunteer/tasks` 系列接口完成链路 D
2. 后台和志愿者端对同一工单状态保持一致展示

### 答辩证明材料

1. 录屏中展示“创建工单 -> 分派 -> 志愿者完成 -> 审计日志”
2. 结合 `/admin/system/integrations` 与 `/admin/system/audit-logs` 作为工程证明
