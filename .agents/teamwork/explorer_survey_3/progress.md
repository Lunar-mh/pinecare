# 调研进度记录 (progress.md)

- **调研角色**: 工程基线与测试体系调研员（Explorer 3）
- **Last visited**: 2026-11-08T13:34:30Z
- **当前状态**: 已完成全维度基线扫描与深度诊断，正在撰写 5-Component 交付件 handoff.md

## 任务执行清单与完成状态
- [x] 初始化专属工作目录、DISPATCH.md、BRIEFING.md、progress.md
- [x] 深度研读 ORIGINAL_REQUEST.md 并明确分支纪律、视觉规范、日志规范
- [x] Git 仓库分支现状、远程跟踪与权限摸排
  - 当前分支：main (唯一本地与远程分支)，远程 URL: https://github.com/MH-ai-ai/old.git
  - 认证状态：GitHub CLI 通过 GH_TOKEN 认证为 MH-ai-ai，具备完全读写权限
  - 工作区状态：DIRTY (169 个文件被删除、34 个文件被修改、1 个未跟踪目录 .agents/)，未进行分支隔离
- [x] 各端工程依赖与构建健康现状扫描
  - root: package.json 仅定义代理脚本，缺乏统一 workspace 与端到端脚本
  - admin (Vue 3 + Vite): 构建通过 (`vue-tsc -b && vite build` 10.16s)，存在 >1MB vendor chunk 告警，测试用例数为 0
  - frontend (Taro 4 + React 18): 构建通过 (`taro build --type weapp` 14.93s)，dist 体积 1004KB（主包远低于 2MB 红线），类型检查通过，测试用例数为 0
  - volunteer (原生 Web): 构建与语法校验脚本通过，测试用例数为 0
  - backend (Node.js CommonJS): lint 通过，但存在致命阻塞——应用无法启动（Cannot find module '../models/familySpace'）
- [x] 静态类型检查与代码检查诊断
  - backend/package.json 的 format:check 脚本硬编码了已被删除的 4 个服务和 4 个测试文件，执行返回 exit code 2
  - backend/src 中 8 个文件因残余 import 被删除模块而发生 MODULE_NOT_FOUND (包括 familyService.js, medicationService.js, 以及孤立的 aiConsultController.js, medicalDirectoryController.js)
  - mysql2 存在 acquireTimeout 无效参数废弃警告
- [x] 现有测试体系摸排与盲区统计
  - 全仓库共有测试文件 218 个，全部集中在 backend/tests（admin、frontend、volunteer 测试覆盖率为 0%）
  - 218 个测试中，有 46 个测试文件因引用已裁撤的 5 大模块 (008, 009, 011, 012, 015) 导致执行失败
  - 核心活跃业务测试文件共 172 个，涵盖用户、服药、健康、SOS、位置、时间银行等
  - 部分集成测试存在依赖未 mock (如 auth 中间件直连 MySQL 连接池) 导致抛出 500 的问题
- [x] 4-Tier 测试方法论与 E2E 蓝图设计
  - Tier 1: 核心功能 API 契约与 UI 状态覆盖
  - Tier 2: 极值、边界、弱网防抖与服务降级
  - Tier 3: 跨系统协同（老人端 SOS -> 后端时间线 -> 社区大屏 -> 志愿者工作台接单闭环）
  - Tier 4: 长辈适老化真实场景（大字体/高对比、语音优先交互、防重复服药误触、防跌倒倒计时取消）
  - 推荐测试运行器方案：后端 Jest + Supertest；Admin 端 Vitest + Playwright；小程序端 Vitest + Playwright (H5/Web预览)；志愿者端 Playwright
- [ ] 产出最终交付物 handoff.md 并向父协调者发送报告
