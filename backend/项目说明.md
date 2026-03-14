# 银伴后端服务

银伴后端是四端共享的唯一业务中枢，负责认证、权限、数据聚合、任务流转、第三方适配、演示场景和审计诊断。当前仍采用单体模块化 Express 架构，不拆微服务，不额外引入第二套后端。

## 当前定位

- 面向竞赛答辩与社区试点的高完成度后端原型。
- 覆盖老人端、家属端、社区管理后台、志愿者端四类角色。
- 统一响应格式固定为 `{ code, message, data }`。
- 同时挂载 `/api/v1/*` 和 `/*` 两套路由前缀，兼容小程序与后台调用。

## 技术栈

- Node.js 18
- Express 4
- MySQL 8
- Redis 7
- mysql2
- ioredis
- jsonwebtoken
- node-cron
- Jest + Supertest

## 目录结构

```text
backend/
├── migrations/              # SQL 迁移脚本
├── src/
│   ├── config/              # 运行模式、demo 场景、数据库配置
│   ├── controllers/         # 控制器
│   ├── middleware/          # 鉴权、参数校验、错误处理
│   ├── models/              # 数据访问层
│   ├── routes/              # 路由注册
│   ├── services/            # 业务服务层
│   ├── jobs/                # 定时任务
│   └── utils/               # 响应、日志、第三方诊断
├── tests/                   # unit / integration / contract / performance
└── server.js                # 启动入口
```

## 已落地的核心能力

### 业务域

- 认证与用户：`/auth`、`/user`
- 健康档案：`/health-archive`
- 用药提醒：`/medication`
- SOS：`/sos`
- 家属守护：`/family`
- 语音交互：`/voice`
- 跌倒检测：`/fall-detection`
- AI 健康咨询：`/ai-consult`
- 药物相互作用：`/drug-interaction`
- 时间银行：`/time-bank`
- AI 伴聊：`/ai-companion`
- 家庭空间：`/family-space`
- 社区管理：`/community`
- GPS：`/gps`
- 医疗资源：`/medical`
- 志愿者自服务：`/volunteer`

### 管理与演示域

- 系统诊断：`/admin/system/integrations`
- 审计日志：`/admin/system/audit-logs`
- Demo 场景列表：`/admin/system/demo/scenarios`
- Demo 场景引导：`/admin/system/demo/bootstrap`

## 当前后端闭环

### 链路 A

- 老人登录
- 获取今日健康/用药摘要
- 确认服药
- 首页状态刷新

### 链路 B

- 老人触发 SOS
- 家属侧感知事件
- 社区后台查看与流转
- 审计日志留痕

### 链路 C

- 家属查看长辈概览
- 家庭空间互动
- 定位与健康摘要辅助守护

### 链路 D

- 社区后台创建工单
- 社区后台分派志愿者
- 志愿者接单、签到、签退、完成
- 工单状态与审计回写

### 链路 E

- 医疗目录查询
- 在线咨询
- 预约
- 报告同步
- 诊断接口说明当前处于 stub 还是 live 模式

## 运行模式

### 全局模式

- `RUNTIME_MODE=COMPETITION_SANDBOX`
- `RUNTIME_MODE=PRODUCTION_LIVE`

也兼容：

- `COMPETITION_SANDBOX=1`
- `PRODUCTION_LIVE=1`

### 细分服务模式

- `AI_CONSULT_MODE=auto|live|stub`
- `VOICE_SERVICE_MODE=auto|live|stub`
- `OSS_MODE=auto|live|stub`
- `MEDICAL_API_MODE=auto|live|stub`

### 当前模式约定

- 竞赛阶段允许 `stub/live` 双模式并存。
- 医疗、语音、AI、OSS 等第三方能力必须可诊断、可解释、可回放。
- `PRODUCTION_LIVE=1` 时会严格限制占位密钥和仅 stub 路径。

## 环境变量

复制 `backend/.env.example` 为 `backend/.env`，至少补齐：

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `REDIS_HOST`
- `REDIS_PORT`
- `JWT_SECRET`

按需启用第三方能力：

- `DASHSCOPE_API_KEY`
- `IFLYTEK_*`
- `AMAP_KEY`
- `ALIYUN_SMS_*`
- `ALIYUN_OSS_*`
- `MEDICAL_API_*`
- `WX_*`

## 常用命令

```bash
npm install
npm run migrate
npm run dev
npm start
npm test
npm run test:unit
npm run test:integration
npm run lint
npm run format:check
```

## 最近一次验证

- 2026-03-11 运行 `npm test` 通过
- 测试结果：`101` 个测试套件、`402` 个测试全部通过
- 覆盖率结果：Statements `54.84%`，Branches `39.55%`，Functions `53.98%`，Lines `55.57%`

## 开发约束

- Controller 只调 Service，不直接访问 Model 或数据库。
- Service 只调 Model，不直接调用 `query()`。
- Model 是唯一允许访问数据库连接层的地方。
- 新路由统一在 `src/routes/index.js` 中通过 `safeUse()` 注册。
- 业务错误统一抛带 `statusCode` 的异常，由错误处理中间件输出标准响应。
- 审计日志不允许记录明文身份证号、密钥、敏感链接。

## 竞赛演示建议入口

建议优先使用这些接口组织录屏和答辩：

- `GET /admin/system/integrations`
- `GET /admin/system/demo/scenarios`
- `POST /admin/system/demo/bootstrap`
- `GET /community/stats`
- `GET /community/orders`
- `GET /volunteer/tasks`
- `GET /admin/system/audit-logs`

## 当前边界

- 医疗能力支持 live 接入，但仍保留稳定的 stub 回放路径。
- 志愿者链路已经形成自服务闭环，但更复杂的排班和多社区调度仍属于后续试点阶段。
- 系统已具备较强竞赛展示能力，不应被描述为完全商业化上线平台。
