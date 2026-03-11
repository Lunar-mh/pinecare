# 银伴全域智慧照护平台

银伴是一个围绕社区居家养老场景搭建的四端协同平台。当前仓库采用 Monorepo 结构，包含共享后端、老人/家属共用小程序、社区管理后台，以及轻量志愿者工作台。项目目标聚焦竞赛闭环和可答辩证据链，不把规划稿、设计稿或 stub 能力直接包装成已全面落地。

## 当前真实状态

- `backend/`：共享 Express 后端，已覆盖认证、健康、用药、SOS、家庭空间、社区管理、医疗、志愿者等主域能力。
- `frontend/`：Taro 4 小程序，老人端与家属端共用一个代码库，当前主包 4 个页面、分包 13 个。
- `admin/`：Vue 3 社区管理后台，承担风险处置和证据展示角色。
- `volunteer/`：轻量志愿者工作台，负责任务执行闭环，不等同于完整第二小程序。

## 目录结构

```text
old/
├── backend/                 # 共享后端
├── frontend/                # 老人端 / 家属端小程序
├── admin/                   # 社区管理后台
├── volunteer/               # 轻量志愿者工作台
├── design/                  # 设计系统与治理文档
├── specs/                   # 功能规格与 OpenAPI 文档
├── AGENTS.md                # 项目知识库与开发约束
└── docker-compose.yml       # 本地联调
```

## 本轮已完成的项目同步重点

- 后端补齐了志愿者自服务命名空间。
- 社区工单支持详情、分派与状态回写。
- 演示场景、系统诊断、审计日志能力同步到最新后端状态。
- 文档索引重建，根目录说明、子项目说明和治理入口已统一。
- 社区管理规格已从旧 `/admin/*` 口径同步到真实 `/community/*`。

## 快速开始

### 后端

```bash
cd backend
npm install
npm run migrate
npm run dev
```

### 小程序前端

```bash
cd frontend
npm install
npm run dev:weapp
```

### 管理后台

```bash
cd admin
npm install
npm run dev
```

### 志愿者工作台

```bash
cd volunteer
npm install
npm run build
```

## 当前验证口径

本仓库以代码和测试为准，近期重点核验项为：

- 2026-03-11：`backend` 执行 `npm test` 通过，`101` 个测试套件、`402` 个测试全部通过，覆盖率达到仓库阈值
- 2026-03-11：`frontend` 执行 `npm run typecheck` 通过
- 2026-03-11：`admin` 执行 `npm run build` 通过
- 2026-03-11：`volunteer` 执行 `npm run build` 与 `npm run typecheck` 通过

## 文档索引

### 工程说明

- [根目录说明](D:/03_Study/Desktop/old/README.md)
- [后端说明](D:/03_Study/Desktop/old/backend/README.md)
- [小程序说明](D:/03_Study/Desktop/old/frontend/README.md)
- [后台说明](D:/03_Study/Desktop/old/admin/README.md)
- [志愿者工作台说明](D:/03_Study/Desktop/old/volunteer/README.md)

### 设计与治理

- [设计目录索引](D:/03_Study/Desktop/old/design/README.md)
- [治理文档入口](D:/03_Study/Desktop/old/design/governance/README.md)
- [项目审计报告](D:/03_Study/Desktop/old/design/governance/13-project-audit-report.md)
- [下一阶段任务拆解](D:/03_Study/Desktop/old/design/governance/14-next-phase-task-breakdown.md)

### 汇报材料

- [项目综合分析报告](D:/03_Study/Desktop/old/银伴_全域智慧照护平台_项目综合分析报告_竞赛评审版.md)
- [设计摘要](D:/03_Study/Desktop/old/DESIGN_SUMMARY.md)

## 当前已知边界

- 医疗、AI、语音等外部能力保留 `stub/live` 双模式，真实接入程度以系统诊断输出为准。
- 项目已经具备较强竞赛展示能力，但仍不应描述为完整商业化上线平台。
- 后续开发默认以 `design/governance/` 为唯一治理来源，避免文档继续漂移。
