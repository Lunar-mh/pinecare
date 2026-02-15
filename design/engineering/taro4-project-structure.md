# Taro 4 前端工程结构（规划）

目标：建立可长期维护的Taro 4（React）工程结构，支撑老人端/家属端多分包与共享组件。

## 约束（已核验）
- 包体：主包≤2MB，分包≤2MB，总≤20MB（见 `银伴_全域智慧照护平台_产品设计方案.md` 对应章节）
- 小程序切后台后约5秒挂起（同上）

## 目录结构（建议）

```
frontend/
  config/
  src/
    app.config.ts
    app.tsx
    assets/
      icons/            # SVG/iconfont（尽量少）
      images/           # 仅关键小图；大图走CDN（待核验接入方式）
    pages/              # 主包页面：启动/登录/首页Tab框架/基础设置
    subpackages/
      health/           # 002 健康档案
      medication/       # 003 用药提醒 + 009 相互作用（如需拆分：待核验）
      sos/              # 004 SOS + 007 跌倒
      voice_ai/         # 006 语音 + 008/011
      timebank/         # 010 时间银行
      family_space/     # 012 家庭空间
      location/         # 014 定位（家属端）
      medical/          # 015 医疗整合
    components/
      elderly/          # 适老化自研组件（大按钮/指标卡/语音入口等）
      base/             # 基础组件（骨架、状态页等）
    services/
      http/             # request封装、错误/重试
      modules/          # 按模块分 service（auth/health/medication/...）
    styles/
      theme/            # NutUI变量覆盖 + tokens映射
      global.scss
    utils/
      a11y/             # 无障碍工具函数（aria-label规范、颜色对比检查：待核验可行性）
      format/
```

## 关键原则
- 主包只保留“必须”页面与资源；所有图表/地图/语音/AI重资源放分包。
- 所有可交互元素满足热区：≥44×44px；主操作按≥60×60执行（条款编号待核验）。
- 设计tokens来源唯一：`design/tokens/tokens.md`。
