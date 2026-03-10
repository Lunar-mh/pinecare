# backend/ — Express API 知识库

**15 模块 REST API，Node.js 18 + Express 4 + MySQL 8 + Redis 7**

## 结构

```
backend/
├── server.js           # 启动入口：env 校验 → 加载 app → 监听端口
├── src/
│   ├── app.js          # Express 实例：中间件链 + 路由挂载 + 启动 jobs
│   ├── routes/         # 路由定义（22 文件）
│   │   └── index.js    # 聚合器，safeUse 安全挂载所有模块
│   ├── controllers/    # 请求处理（25 文件）
│   ├── services/       # 业务逻辑（56 文件，最密集层）
│   ├── models/         # 数据访问—raw SQL（32 文件）
│   ├── middleware/     # 横切关注点（12 文件）
│   │   └── validators/ # 路由级入参校验
│   ├── jobs/           # 定时任务（node-cron）
│   ├── utils/          # 共享工具（response, validators, errorCodes…）
│   └── config/         # database.js + db.js（别名）+ validateEnv.js
├── migrations/         # SQL 迁移脚本（001-029+），按编号顺序执行
└── tests/
    ├── integration/    # 主力测试（25 文件，按模块拆分）
    ├── performance/    # 性能测试（15 文件，需服务已启动）
    ├── contract/       # 契约测试（4 文件）
    └── helpers/        # setup.js（Jest 全局配置）
```

## 查找导航

| 任务 | 位置 |
|------|------|
| 新增模块路由 | `routes/index.js` 用 `safeUse` 挂载，然后建 `routes/<module>.js` |
| 新增接口逻辑 | `controllers/<module>Controller.js` → `services/<module>Service.js` → `models/<module>Model.js` |
| 数据库连接池 | `config/database.js`（`db.js` 是其别名，等价） |
| JWT 认证中间件 | `middleware/auth.js` |
| 限流中间件 | `middleware/rateLimiter.js`（Redis 滑动窗口） |
| 家属访问控制 | `middleware/familyAccess.js` |
| 全局错误处理 | `middleware/errorHandler.js`（必须最后挂载） |
| 统一响应工具 | `utils/response.js` → `ok()` / `fail()` |
| 入参校验工具 | `utils/validators.js` → validatePhone / validateRequired 等 |
| 业务错误码 | `utils/errorCodes.js` |
| 定时任务入口 | `jobs/index.js`（`startMedicationJobs`） |
| 执行 DB 迁移 | `npm run migrate`（runs `migrations/run.js`） |

## 分层约束（严格，不得违反）

```
Controller  →  Service  →  Model  →  database.js
```
- **Controller**：只调 Service + 用 `ok()`/`fail()`/`handleError()` 响应，不碰 DB
- **Service**：只调 Model，不直接 `query()`，负责业务校验、审计日志
- **Model**：唯一可调 `database.query()` 的层，负责 SQL + 行映射

## 必须遵守的实现模式

## 核心模式（必须遵守）

**响应**：`ok(res, data)` / `fail(res, code, msg)` — 禁止裸 `res.json()`

**错误**：Controller 用 `handleError(res, err)`；Service 抛 `err.code = 404`

**路由**：`safeUse('/模块', './模块')` — 文件不存在时静默跳过

**Model**：行映射时显式解析 JSON 字段；动态更新用 fieldMap 过滤 undefined

**中间件顺序**：json(10mb) → cors → 路由 → errorHandler（最后）

**auth 用法**：`router.get('/x', auth, controller.x)`

## 命名约定

| 元素 | 约定 | 示例 |
|------|------|------|
| 文件 | camelCase | `userService.js` |
| 方法 | camelCase | `findByUserId()` |
| DB 表/字段 | snake_case | `medication_plans`, `user_id` |
| 路由路径 | kebab-case | `/health-archive` |

## 测试

```bash
npm test                        # 全量 Jest + coverage（阈值 50%）
npx jest tests/integration/<module>.test.js  # 单模块测试
npx jest tests/performance/<module>.perf.test.js --testTimeout=120000  # 性能测试（需服务启动）
```

- 测试不启动 jobs（`NODE_ENV=test` 时 `startMedicationJobs` 被跳过）
- `tests/helpers/setup.js` 包含全局 mock 和数据库清理逻辑

## 注意事项

- `db.js` = `database.js` 别名，两者等价，新代码统一用 `database.js`
- `medicalApiService.js` 是第三方医疗平台 stub，未对接真实 API
- CI 的 Docker build job 被 `if: false` 禁用
- 无 ESLint/Prettier，靠约定维护风格
- 敏感字段脱敏：身份证号日志仅保留前3位+后2位，第三方密钥不回显前端
