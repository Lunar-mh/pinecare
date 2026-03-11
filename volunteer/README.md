# 银伴志愿者工作台

`volunteer/` 是轻量志愿者移动工作台，不是第二套完整小程序，也不是社区后台的镜像。它只服务链路 D 的任务执行闭环。

## 当前定位

- 今日任务入口
- 接单与签到签退
- 服务完成与工时回写
- 培训提醒与个人成长摘要

## 技术形态

- 轻量 H5 工作台
- 静态资源构建输出到 `dist/`
- 不承担复杂管理配置能力

## 运行方式

```bash
npm install
npm run build
npm run typecheck
```

## 当前页面结构

当前工作台围绕三类入口组织：

- 首页：今日待办、工时、紧急协助、培训提醒
- 任务：待接单、进行中、待确认、已完成
- 我的：工时、等级、排班、培训

## 与后端的关键接口

- `GET /volunteer/profile`
- `GET /volunteer/tasks`
- `POST /volunteer/tasks/:taskId/accept`
- `POST /volunteer/tasks/:taskId/check-in`
- `POST /volunteer/tasks/:taskId/check-out`
- `POST /volunteer/tasks/:taskId/complete`
- `GET /volunteer/training`

## 当前边界

- 不承担社区审核、系统配置、老人全量档案浏览。
- 只显示执行任务所需的最小必要信息。
- 更复杂的排班、评级、跨社区调度属于试点阶段再扩展的能力。
