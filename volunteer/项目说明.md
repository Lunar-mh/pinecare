# volunteer/

志愿者任务执行端。当前版本已经从静态展示页改为接口驱动页面，使用统一后端完成登录、任务接单、签到、签退、完成任务与培训记录查询。

## 默认环境
- 默认 API 基线：`http://127.0.0.1:3001/api/v1`
- 显式覆盖方式：登录页 API 地址输入框
- 默认目标：在非 live 状态下完整复现志愿者任务执行链路

## 常用命令
```bash
npm install
npm run typecheck
npm run build
```

## 当前收口状态
- 已接入 `/auth/sms-code`、`/auth/phone`
- 已接入 `/volunteer/profile`、`/volunteer/tasks`、`/volunteer/training`
- 已接入任务接单、签到、签退、完成动作
- 构建和类型检查已验证通过

## 答辩链路
1. 登录志愿者账号
2. 查看待处理任务
3. 接单并执行签到/签退
4. 完成任务
5. 在管理端查看状态同步和复盘结果
