# 实施计划: 语音交互基础

**分支**: `006-voice-interaction` | **日期**: 2025-07-18

## 概述
银伴平台适老化语音交互功能。包括语音唤醒、语音查询、语音控制、方言识别、语音播报等。

## 技术背景
**语言/版本**: Node.js 18.x, Express 4.x, MySQL 8.0, Redis 7.x  
**主要依赖**: Taro 4.x (前端), 阿里云NLS语音服务（主）, 科大讯飞ASR（备）, TTS  
**存储**: MySQL + Redis  
**Testing**: Jest + Supertest (后端), Vitest (前端)  
**Target Platform**: 微信小程序  
**Project Type**: 移动端小程序 + 后端API服务  
**Performance Goals**: ASR识别延迟 <2秒, TTS合成 <1秒, 方言识别准确率 >80%  
**Constraints**: 依赖第三方ASR/TTS API，需处理网络超时降级  
**Scale/Scope**: MVP阶段支持万级用户

## 跨模块依赖

- 当前实现计划未定义对其他业务模块（001-015）的强依赖（按模块内自包含服务规划）。
- 若后续需要复用其他模块的数据/接口（如统一鉴权、绑定关系、健康档案摘要等），必须在此补充：依赖模块、数据/接口契约、失败语义，并同步更新 tasks.md。

## 指标口径与观测

- **响应时间**：默认以 p95 口径度量；起止点为“网关/服务入口接收请求”到“返回响应”的服务端耗时。
- **成功率**：以业务成功码（如 `code=0`）与 HTTP 状态码综合统计；需明确计入/排除的失败类型。
- **外部依赖**：第三方 API 超时/限流/不可用应单独计数，并在错误语义中区分。
- **审计与隐私**：访问敏感数据的关键行为需记录审计日志；日志字段需脱敏。

## 宪法检查
| 宪法原则 | 检查结果 | 说明 |
|----------|----------|------|
| 数据真实性 | ✅ PASS | 语音内容真实采集，不伪造识别结果 |
| 可落地优先 | ✅ PASS | 调用成熟第三方ASR/TTS API，无需自研模型 |
| 中文优先 | ✅ PASS | 全程中文交互，支持普通话及主要方言 |
| 删繁就简 | ✅ PASS | MVP只做语音查询与播报，不做复杂对话管理 |
| 前后一致性 | ✅ PASS | 语音命令映射到现有功能接口，不新增数据模型 |
| 分阶段交付 | ✅ PASS | MVP基础语音，后续扩展方言与主动播报 |
| 适老化设计 | ✅ PASS | 语音为主要交互方式，降低老人操作门槛 |

## 项目结构
### Documentation (this feature)

```text
specs/006-voice-interaction/
├── plan.md              # This file
├── research.md          # 阶段0产物
├── data-model.md        # 阶段1产物
├── quickstart.md        # 阶段1产物
├── contracts/           # 阶段1产物
│   └── openapi.yaml    # API接口定义
└── tasks.md            # 阶段2产物
```

### Source Code (repository root)

```text
# 后端服务
backend/
├── src/
│   ├── controllers/voiceController.js
│   ├── services/asrService.js
│   ├── services/ttsService.js
│   ├── services/voiceCommandService.js
│   ├── models/voiceSession.js
│   ├── routes/voice.js
│   └── utils/audioEncoder.js
├── tests/
└── package.json

# 前端小程序
frontend/
├── src/pages/voice/
├── src/components/voice-button/
├── src/services/voiceService.js
└── package.json
```

**Structure Decision**: 采用前后端分离架构（Option 2），后端Node.js+Express，前端Taro跨端小程序。语音能力通过调用第三方ASR/TTS API实现，前端负责音频采集与播放。

## Design Decisions

### ASR/TTS 供应商选型

| 维度 | 决策 | 理由 |
|------|------|------|
| 主供应商 | 阿里云NLS语音服务 | 与通义千问同生态降低集成复杂度；方言支持覆盖粤语/闽南语/四川话；SDK完善 |
| 备用供应商 | 科大讯飞 | 降级方案，普通话ASR准确率业界领先 |
| TTS音色 | 阿里云温柔女声（airuoxi） | 语速0.8×，字正腔圆，适合老年用户 |
| 降级策略 | 阿里云请求超时 >3秒自动切换讯飞 | 保证服务可用性 |

## Complexity Tracking

> 无宪法违规，无需特别说明
