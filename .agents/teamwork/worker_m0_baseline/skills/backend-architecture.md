# 生产级后端分层架构规范 (Backend Architecture)

本技能为**银伴后端服务（Node.js 18 + Express 4 + MySQL 8 + Redis 7）**确立标准的三层单体模块化工程架构。

## 1. 架构核心原则与三层分层约束
- **Controller 只调 Service**：严禁在 Controller 中编写 SQL 查询或直接连接数据库。
- **Service 只调 Model**：承载核心领域规则、事务控制与跨服务编排，严禁在 Service 中直接执行原生 SQL。
- **Model 才是唯一访问数据库的层次**：只有 `src/models/*.js` 允许引用 `database.js` 连接池。

## 2. 路由机制与双前缀挂载
- 必须在应用根层同时挂载 `/api/v1` 和 `/`：
  - `app.use('/api/v1', routes)`
  - `app.use('/', routes)`

## 3. 控制器层规范
- Controller 纯做 HTTP 协议适配：参数提取与模式校验、提取 `req.user` 上下文、调用单个 Service 并通过 `ok()` / `fail()` 输出结果。
- 异常交由统一中间件或 `next(err)` 处理。

## 4. 服务层与 MySQL 事务管理
- 涉及跨表变更或状态扣减，必须严格使用数据库连接池事务：
  - `connection = await pool.getConnection()`
  - `await connection.beginTransaction()`
  - 异常回滚 `await connection.rollback()`
  - `finally` 块中强制 `connection.release()`，杜绝连接池耗尽。

## 5. Redis 缓存架构与防御机制
- 统一 Key 命名规范：`yinban:{module}:{entity}:{id}`。
- 强制显式设置 TTL 过期时间，严禁无期限持久 Key。
- 短期空对象防穿透（TTL 60s），分布式互斥锁防热点击穿。

## 6. 安全与中间件
- 启用 Helmet、CORS、JWT 认证与敏感端点速率限制（Rate Limiting）。
- 生产环境严禁直接将 Node.js 崩溃堆栈向客户端泄露。
