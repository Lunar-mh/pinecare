# Copilot 指南 - 青松安护（PineCare）智慧照护平台

四端智能养老平台：长辈小程序、家属小程序、社区管理后台、志愿者工作站，共用统一后端。

## 常用命令

### 后端 (`cd backend`)

```bash
npm run dev                     # 开发服务器 (nodemon)
npm run lint                    # ESLint (--max-warnings=0)
npm run format:check            # Prettier 检查
npm test                        # 全部测试 + 覆盖率
npm run test:unit               # 仅单元测试
npm run test:integration        # 仅集成测试
npm run test:security           # 安全测试套件
npm run migrate                 # 运行数据库迁移

# 运行单个测试文件
npm test -- tests/unit/medicationPlanService.test.js

# 按名称匹配运行测试
npm test -- --testNamePattern="should create plan"
```

### 前端小程序 (`cd frontend`)

```bash
npm run dev:weapp               # 开发模式 (watch)
npm run build:weapp             # 生产构建
npm run typecheck               # TypeScript 检查
```

### 管理后台 (`cd admin`)

```bash
npm run dev                     # Vite 开发服务器
npm run build                   # vue-tsc && vite build
```

### Docker

```bash
docker-compose up               # 启动后端 + MySQL + Redis
```

## 架构概览

### 后端 (Express + MySQL + Redis)

**请求流程：** `routes/*.js` → `controllers/*.js` → `services/*.js` → `models/*.js` → MySQL

- Routes：定义端点，挂载中间件（auth、rate limiting）
- Controllers：处理 HTTP 层，调用 service，使用 `ok(res, data)` 或 `fail(res, code, message)` 返回
- Services：业务逻辑层，通过 `createBizError(code, message, statusCode)` 抛出错误
- Models：执行参数化 SQL 查询（无 ORM）

**响应格式：** 统一使用 `{ code: 0, message, data }`，`code: 0` 表示成功。

**认证：** JWT，access token 15分钟，refresh token 7天。管理员会话通过 Redis 验证。

### 前端小程序 (Taro 4 + React)

**页面结构：**
```
pages/{name}/
├── index.tsx           # React 组件
└── index.config.ts     # 导航配置
```

**数据流：** 组件 → Service (`/services/modules/*.ts`) → View-Model (`/view-models/*.ts`) → UI

- Services 处理 API 调用，自动刷新 token
- View-models 将 API 数据转换为展示格式
- 使用 React 本地状态 + Taro Storage 持久化

**角色设计：** 长辈/家属模式，在 `/design/` 中定义各自的导航、配色和组件变体。

### 管理后台 (Vue 3 + Element Plus)

**功能模块结构：**
```
views/{feature}/index.vue       # Vue 组件 (<script setup>)
services/{feature}.ts           # 类型化 API 函数
```

**模式：** 列表页使用 `usePagination` 组合式函数。Services 为所有请求/响应定义 TypeScript 接口。

## 关键约定

### 后端

- **错误处理：** Services 抛出 `createBizError(code, message, statusCode)`，Controllers 使用 `handleError(res, err)` 捕获
- **中间件顺序：** `requestContext` → `securityHeaders` → `cors` → routes → `errorHandler`
- **测试 Mock：** 单元测试 mock models，集成测试 mock DB/Redis，API 测试使用 `supertest`
- **数据库：** 使用 `mysql2/promise` 的原生 SQL，始终使用参数化查询，通过 row-mapping 函数转换数据库行

### 前端小程序 (Taro)

- **生命周期：** 使用 `useLoad` 初始加载数据，`useDidShow` 静默刷新
- **组件：** 页面包裹在 `<PageShell roleTone="elder|family">`，使用 `/components/elderly/` 下的大按钮、高对比度输入框等无障碍组件
- **Storage 键：** `token`、`refresh_token`、`userRole`、`roleSelectTime`

### 管理后台 (Vue)

- **API 客户端：** 使用 `/services/api.ts` 的 `http.get/post/put/delete`，用 `URLSearchParams` 构建查询字符串
- **错误提示：** 使用 `ElMessage` 显示 toast 通知
- **格式化：** `/utils/format.ts` 提供日期、用户名、风险等级等格式化函数

## 新增功能指南

### 后端接口

1. 在 `src/routes/{feature}.js` 创建路由，挂载 auth 中间件
2. 在 `src/controllers/{feature}Controller.js` 创建控制器
3. 在 `src/services/{feature}Service.js` 创建服务
4. 在 `src/models/{feature}Model.js` 创建模型
5. 在 `src/routes/index.js` 挂载：`safeUse('/path', './{feature}')`
6. 在 `tests/unit/` 添加单元测试，`tests/integration/` 添加集成测试

### 前端页面

1. 创建 `pages/{name}/index.tsx` 和 `index.config.ts`
2. 在 `services/modules/{feature}.ts` 添加 service 函数
3. 在 `view-models/{feature}.ts` 添加数据转换逻辑
4. 在 `design/navigation.ts` 更新导航配置

### 管理后台视图

1. 创建 `views/{feature}/index.vue`，列表页使用 `usePagination`
2. 在 `services/{feature}.ts` 添加带类型的 service
3. 在 `router/index.ts` 添加路由
4. 在 `design/navigation.ts` 更新导航配置
