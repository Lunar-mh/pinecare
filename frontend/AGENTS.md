# frontend/ — Taro 微信小程序知识库

**Taro 4 + React 18 + TypeScript，微信小程序用户端**

## 结构

```
frontend/
├── src/
│   ├── app.tsx               # Taro 根组件
│   ├── app.config.ts         # 页面注册 + TabBar + 分包配置
│   ├── app.scss              # 全局样式
│   ├── assets/               # 静态资源（tabbar 图标等）
│   ├── components/elderly/   # 老年人无障碍组件（大字体、高对比）
│   │   ├── LargeButton/
│   │   ├── LargeInput/
│   │   ├── MetricCard/
│   │   ├── SectionTitle/
│   │   ├── ChartCard/
│   │   ├── AlertBanner/
│   │   └── VoiceEntryButton/
│   ├── pages/                # 主包页面（4 个）
│   │   ├── login/
│   │   ├── index/            # 关怀首页
│   │   ├── services/         # 服务页
│   │   └── profile/          # 我的
│   ├── subpackages/          # 分包（11 个，按模块划分）
│   │   ├── health/           # 健康档案（001）
│   │   ├── medication/       # 用药提醒（002）
│   │   ├── sos/              # 紧急SOS（003）
│   │   ├── voice_ai/         # 语音交互（005）
│   │   ├── timebank/         # 时间银行（009）
│   │   ├── family_space/     # 家庭空间（011）
│   │   ├── location/         # GPS追踪（013）
│   │   ├── medical/          # 医疗资源（014）
│   │   ├── ai_consult/       # AI健康咨询（007）
│   │   ├── drug_check/       # 药物相互作用（008）
│   │   └── ai_companion/     # AI伴聊（010）
│   ├── services/
│   │   ├── request.ts        # HTTP 封装（拦截器、超时、错误处理）
│   │   ├── types.ts          # 全局类型定义
│   │   └── modules/          # API 模块（13 文件，按模块拆分）
│   ├── styles/                # 全局样式变量
│   └── utils/                # 工具函数
├── config/index.ts           # Taro 构建配置
├── project.config.json       # 微信 IDE 项目配置
├── babel.config.js           # Babel 预设
├── tsconfig.json             # TypeScript 配置
└── package.json
```

## 查找导航

| 任务 | 位置 |
|------|------|
| HTTP 请求封装 | `services/request.ts`（基于 Taro.request） |
| 接口调用 | `services/modules/<module>Api.ts` → `services/request` |
| 类型定义 | `services/types.ts`（后端响应 + 业务类型） |
| 主包页面 | `pages/<page>/index.tsx` |
| 分包页面 | `subpackages/<module>/pages/index/index.tsx` |
| 分包配置 | `app.config.ts` → `subPackages` |
| TabBar 配置 | `app.config.ts` → `tabBar` |
| 老年人组件 | `components/elderly/<Component>/` |
| 环境判断 | `request.ts` → `getEnvVersion()`（release/dev/trial） |
| 微信登录 | `services/modules/wechatApi.ts`（使用 `wx.login`） |
| 微信支付 | `services/modules/paymentApi.ts` |
| 蓝牙连接 | `services/modules/bluetoothApi.ts`（健康设备） |
| 地图/定位 | `services/modules/locationApi.ts`（高德/微信定位） |
| 音频录制 | `services/modules/voiceApi.ts`（讯飞 ASR） |

## 核心模式（必须遵守）

**HTTP**：`get/post/put/del` 从 `@/services/request` 导入
- 统一 token 注入、错误弹窗、401 跳转登录

**跳转**：`Taro.navigateTo()` / `Taro.reLaunch()` / `Taro.navigateBack()`

**分包**：在 `app.config.ts` → `subPackages` 注册

**老年人组件**：`components/elderly/` 下 `LargeButton`、`MetricCard` 等

**环境**：`request.ts` → release 用 `https://api.yinban.com`，其他用本地 `localhost:3000`

## 命令

```bash
npm run dev:weapp     # 开发构建（watch 模式）
npm run build:weapp   # 生产构建 → dist/weapp
npm run typecheck     # tsc -p tsconfig.json --noEmit
```

## 注意事项

- 分包总大小不超过 2MB，单个分包不超过 500KB
- `request.ts` 统一处理 token 注入 + 错误弹窗 + 401 跳转登录
- 敏感数据（如 token）存 `Taro.getStorageSync('token')`，不要存 `localStorage`
- 微信开发者工具打开 `dist/weapp` 预览
- TypeScript 严格模式：`strict: true`，禁止 `any` 隐式
- 图表使用 ECharts（Taro 适配版）
