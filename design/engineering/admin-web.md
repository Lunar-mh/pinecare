# 社区管理端 Web（模块013）工程化（规划）

## 技术栈（来自产品文档）
- Vue 3 + TypeScript
- Vite
- UI组件库：Ant Design Vue
- 可视化：ECharts 5（DataV：待核验是否必需）

## 当前状态
- 已用 Vite 创建了 `admin/` 工程骨架（Vue3+TS）。

## 下一步
- 安装并配置 Ant Design Vue（按官方方式；细节待核验）
- 建立路由/权限骨架（角色矩阵以模块013规格为准）
- 页面优先级：登录 → 看板 → 志愿者 → 工单 → 活动 → 统计

## 验收
- `admin/` 可 `npm run dev` 启动且无构建错误
- 关键页面可访问，路由与权限工作
