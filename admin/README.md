# 银伴社区管理后台

管理后台采用 Vue 3 + Vite + Element Plus，定位不是重型企业中台，而是社区运营指挥台和竞赛答辩中的全局证据展示中心。

## 技术栈

- Vue 3
- TypeScript
- Vite 7
- Vue Router
- Element Plus

## 当前定位

- 支撑社区管理人员查看全局状态、处理风险事件、管理工单与活动。
- 承担答辩中的“全链路证明入口”。
- 与共享后端的 `/community/*` 和 `/admin/system/*` 接口协同工作。

## 当前页面模块

当前 `src/views` 已包含以下主要方向：

- `dashboard`
- `users`
- `family`
- `health`
- `medication`
- `sos`
- `gps`
- `fall`
- `drug`
- `timebank`
- `medical`
- `community`
- `volunteers`
- `analytics`
- `login`

## 竞赛阶段优先顺序

### P0

- 今日工作台
- 用户与家庭绑定
- 健康监管
- 用药监管
- SOS 风险中心
- GPS 风险中心
- 社区工单与活动概览

### P1

- 志愿者管理
- 时间银行审核
- 医疗资源展示
- 跌倒检测与药物风险专题

## 运行方式

```bash
npm install
npm run dev
npm run build
```

## 当前边界

- 不扩写成低代码平台、流程引擎或大而全 BI 系统。
- 竞赛阶段优先服务风险处置和答辩展示，不平均铺满所有管理功能。
- 志愿者执行细节由 `volunteer/` 轻量工作台承担，不在后台重复建设同构页面。
