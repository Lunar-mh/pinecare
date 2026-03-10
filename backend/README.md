# 银伴后端服务说明

## 环境要求
- Node.js 18+
- MySQL 8.0+
- Redis 7+

## 环境变量
1. 复制 `.env.example` 为 `.env`
2. 配置以下关键变量：
   - `PORT`
   - `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME`
   - `REDIS_HOST` `REDIS_PORT`
   - `JWT_SECRET`

## 安装依赖
```bash
npm install
```

## 启动服务
```bash
npm run dev
```
或
```bash
npm start
```

## 迁移数据库
当前健康档案模块新增迁移：
- `migrations/002_create_health_archives.sql`
- `migrations/003_create_device_bindings.sql`
- `migrations/004_create_health_records.sql`
- `migrations/005_add_health_archive_indexes.sql`

可通过已有迁移脚本执行：
```bash
npm run migrate
```

## 运行测试
```bash
npm test
```

仅运行健康档案测试：
```bash
npx jest tests/health.query.test.js tests/device.sync.test.js tests/health.manual.test.js tests/health.family.test.js tests/health.alert-and-response.test.js
```

性能测试（需要服务已启动）：
```bash
npx jest tests/performance/health.perf.test.js --testTimeout=120000
```

## 015 医疗资源整合模块说明

### 第三方依赖假设
- 当前 `src/services/medicalApiService.js` 为第三方医疗平台客户端桩实现（stub）。
- 环境变量占位：
  - `MEDICAL_API_BASE_URL`：第三方医疗平台基础地址
  - `MEDICAL_API_KEY`：第三方医疗平台访问密钥
- 已预留超时、重试与错误映射逻辑，后续仅需替换 requestWithRetry 内的真实 HTTP 调用即可切换到生产对接。

### 错误语义
- 统一响应结构：`{ code, message, data }`
- 常见业务错误码：
  - `422`：请求参数非法
  - `401`：未认证或令牌失效
  - `404`：资源不存在
  - `409`：状态冲突或不允许的状态流转
  - `503`：第三方医疗服务不可用/限流
  - `504`：第三方医疗服务超时

### 敏感字段与脱敏要求
- 敏感字段（如身份证号、报告内容明细、诊断结果）禁止直接写入明文业务日志。
- 若需要落日志定位问题，需遵循：
  - 身份证号仅保留前 3 位和后 2 位
  - 报告内容仅记录 `reportNo`、`reportType`、`reportDate`
  - 会话链接、第三方流水号仅用于排障链路，不在前端错误提示中回显

## 003 用药提醒模块
### 执行用药模块迁移
```bash
node src/utils/migrate.js
```

### 关键接口
- `GET /medication/plans`：获取当前用户用药计划
- `POST /medication/plans`：新增用药计划
- `PUT /medication/plans/:id`：更新用药计划
- `DELETE /medication/plans/:id`：删除用药计划
- `GET /medication/logs`：查询服药日志（支持 `start_date/end_date`）
- `POST /medication/confirm`：确认服药（`taken/skipped`）
- `GET /medication/history/calendar?month=YYYY-MM`：查询月历统计
- `GET /medication/settings` / `PUT /medication/settings`：读取与更新提醒设置

### 定时任务
- `medicationReminderJob`：每分钟检查并发送首提醒
- `medicationFollowupJob`：每5分钟执行二次提醒与missed处理
- `refillReminderJob`：每日 09:00 执行续药提醒

### 模块测试
```bash
npx jest tests/medication.plans.test.js tests/medication.logs-confirm.test.js tests/medication.history-calendar.test.js tests/medication.settings.test.js tests/jobs.medication-reminder.test.js tests/jobs.family-refill.test.js
```
