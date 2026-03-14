# admin/

管理后台，使用 Vue 3 + Vite + Element Plus。当前版本已接入后端证据聚合和事件复盘接口，可承担答辩中的运营与诊断展示。

## 默认环境
- 默认 API 基线：`http://127.0.0.1:3001`
- 显式覆盖方式：设置 `VITE_API_BASE_URL`
- 默认目标：展示非 live 状态下的运行态、证据、复盘和关键处置动作

## 常用命令
```bash
npm install
npm run build
npm run dev
```

## 当前收口状态
- Dashboard 已接入 `/admin/system/evidence`
- GPS 页面已接入 `/admin/system/event-replay`
- 医疗、志愿者、社区等页面具备关键读接口和动作闭环
- 构建已验证通过

## 核心接口
- `/api/v1/admin/system/integrations`
- `/api/v1/admin/system/evidence`
- `/api/v1/admin/system/event-replay`
- `/api/v1/admin/system/demo/bootstrap`

## 联调说明
- 默认直连 Docker 演示基线
- 如需切换环境，只通过 `VITE_API_BASE_URL` 覆盖，不修改源码默认值
