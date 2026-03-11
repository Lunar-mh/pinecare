# 银伴小程序前端

前端采用 Taro 4 + React 18 + TypeScript，承载老人端和家属端两种前台角色。竞赛阶段继续共用一个小程序代码库，通过角色和信息架构区分体验，不拆成两个独立项目。

## 当前定位

- 老人端：低认知负担的日常照护入口。
- 家属端：远程守护与协同决策入口。
- 同一套代码同时服务链路 A、B、C，并为链路 E 提供轻入口。

## 技术栈

- Taro 4
- React 18
- TypeScript
- NutUI React Taro
- 微信小程序

## 当前目录结构

```text
frontend/
├── src/
│   ├── pages/               # 主包页面
│   ├── subpackages/         # 功能分包
│   ├── components/elderly/  # 老年友好组件
│   ├── services/            # 请求封装与类型
│   └── utils/               # 通用工具
├── config/                  # Taro 构建配置
└── scripts/                 # 清理与辅助脚本
```

## 当前主包页面

当前主包保持精简，只保留高频入口：

- `pages/login`
- `pages/index`
- `pages/services`
- `pages/profile`

## 当前分包

截至 2026-03-11，`src/subpackages` 下共有 13 个分包：

- `ai_companion`
- `ai_consult`
- `drug_check`
- `family_health`
- `family_space`
- `health`
- `location`
- `medical`
- `medication`
- `settings`
- `sos`
- `timebank`
- `voice_ai`

## 与四端规划的关系

### 老人端优先能力

- 首页状态总览
- 今日用药
- 健康档案
- SOS
- 语音入口
- 家庭空间轻互动

### 家属端优先能力

- 长辈状态概览
- 用药进度
- SOS 感知
- 定位共享
- 家庭空间互动

## 运行方式

```bash
npm install
npm run dev:weapp
npm run build:weapp
npm run typecheck
```

微信开发者工具请打开 `dist/weapp`。

## 与后端的依赖关系

- 请求封装：`src/services/request.ts`
- 类型定义：`src/services/types.ts`
- 默认对接项目根后端的无前缀或 `/api/v1` 路由

前端当前依赖的关键后端域包括：

- `/auth`
- `/health-archive`
- `/medication`
- `/sos`
- `/family`
- `/family-space`
- `/gps`
- `/medical`
- `/voice`
- `/ai-consult`
- `/drug-interaction`
- `/time-bank`

## 当前边界

- 老人端和家属端虽然共用一个代码库，但信息优先级必须区分，不能简单镜像。
- 竞赛阶段不新增泛娱乐、商城、长链聊天等偏航能力。
- 志愿者不是这个小程序的第三种前台角色，志愿者能力由独立轻量工作台承载。
