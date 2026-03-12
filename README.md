# 银伴全域智慧照护平台

银伴是面向长者、家属、社区和志愿者的四端智慧照护平台。当前仓库已经完成非 live 收官：后端、管理端、小程序和志愿者端都能以统一默认环境构建运行，后续只需要填入真实凭据并切换真实 provider。

## 当前状态
- 后端：Express + MySQL + Redis，已完成统一诊断、统一事件流、competition seed、fresh-install smoke、CI 全链路校验
- 小程序：Taro + React，核心入口已接到现有后端流程，默认 API 基线为 `http://127.0.0.1:3001/api/v1`
- 管理端：Vue 3 + Vite，已接入 `/admin/system/evidence` 与 `/admin/system/event-replay`，默认 API 基线为 `http://127.0.0.1:3001`
- 志愿者端：接口驱动任务执行端，默认 API 基线为 `http://127.0.0.1:3001/api/v1`

## 仓库结构
```text
old/
├── backend/      # 后端与诊断、competition seed、部署文档
├── frontend/     # 微信小程序用户端
├── admin/        # 管理后台
├── volunteer/    # 志愿者任务执行端
├── specs/        # 15 个功能模块规格与 OpenAPI
├── design/       # 设计与治理资料
└── docker-compose.yml
```

## 统一默认环境
- Docker 演示基线：`http://127.0.0.1:3001`
- 宿主机 MySQL 演示口径：`127.0.0.1:13307`
- 如需覆盖默认地址：
  - 小程序：`TARO_APP_API_BASE_URL`
  - 管理端：`VITE_API_BASE_URL`
  - 志愿者端：登录页 API 地址输入框或本地存储覆盖

## 常用命令
### 后端
```bash
cd backend
npm install
npm run lint
npm test
npm run smoke:fresh-install
npm run seed:competition:verify -- --dry-run
npm run migrate
npm start
```

### 小程序
```bash
cd frontend
npm install
npm run typecheck
npm run build:weapp
```

### 管理端
```bash
cd admin
npm install
npm run build
```

### 志愿者端
```bash
cd volunteer
npm install
npm run typecheck
npm run build
```

## 答辩主线
1. `SOS / 跌倒 / GPS` 异常 -> 通知 -> 社区处置 -> 后台复盘
2. 医疗目录 -> 预约创建 -> 证据接口展示模式和最近状态
3. 志愿者任务 -> 接单 -> 签到签退 -> 完成任务 -> 后台同步变化

## 文档入口
- 后端部署：`backend/docs/deployment-playbook.md`
- 发布候选说明：`backend/docs/four-end-release-candidate.md`
- 合规与参赛包：`backend/docs/compliance-and-contest-package.md`
- Live 切换交接：`backend/docs/live-cutover-handover.md`
- 真实证据模板：`backend/docs/live-evidence-templates.md`
