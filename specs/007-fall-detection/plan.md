# 实施计划: 跌倒检测基础版

**分支**: `007-fall-detection` | **日期**: 2025-07-18

## 概述
基于智能手环的跌倒检测与自动告警，采用三轴加速度传感器阈值算法检测跌倒事件，自动触发SOS紧急通知。

## 技术背景
**语言/版本**: Node.js 18.x, Express 4.x, MySQL 8.0, Redis 7.x  
**主要依赖**: Taro 4.x (前端), Express (后端), mysql2, ioredis, 微信服务通知  
**存储**: MySQL + Redis  
**Testing**: Jest + Supertest (后端), Vitest (前端)  
**Target Platform**: 微信小程序 + 智能手环（蓝牙BLE）  
**Project Type**: 移动端小程序 + 后端API服务  
**Performance Goals**: 检测准确率 >85%, 告警触发延迟 <5秒  
**Constraints**: 依赖手环BLE连接稳定性, MVP阶段不引入ML训练基础设施  
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
| 数据真实性 | ✅ PASS | 传感器原始数据真实采集，不模拟跌倒事件 |
| 可落地优先 | ✅ PASS | 阈值模型MVP可快速交付，无需ML基础设施 |
| 中文优先 | ✅ PASS | 告警提示与日志全程中文 |
| 删繁就简 | ✅ PASS | 阈值模型替代复杂ML流水线，符合宪法原则 |
| 前后一致性 | ✅ PASS | 检测触发后复用004 SOS通知链路 |
| 分阶段交付 | ✅ PASS | MVP基础阈值检测，后续版本可提升精度 |
| 适老化设计 | ✅ PASS | 自动触发无需用户操作，误报提供15秒确认取消窗口 |

## 项目结构
### Documentation (this feature)

```text
specs/007-fall-detection/
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
│   ├── controllers/fallDetectionController.js
│   ├── services/fallDetectionService.js
│   ├── services/alertService.js
│   ├── models/fallEvent.js
│   ├── routes/fallDetection.js
│   └── utils/sensorDataProcessor.js
├── tests/
└── package.json

# 前端小程序
frontend/
├── src/pages/fall-detection/
├── src/components/fall-alert/
├── src/services/bleService.js
└── package.json
```

**Structure Decision**: 采用前后端分离架构（Option 2），后端Node.js+Express，前端Taro跨端小程序。手环通过BLE与小程序通信，传感器数据由前端预处理后上报后端。

## Design Decisions

### 跌倒检测算法选型

| 方案 | 选择 | 理由 |
|------|------|------|
| MVP方案 | 阈值模型（三轴加速度） | 无需ML基础设施，符合宪法"删繁就简"原则，开发周期短 |
| 阈值策略 | 垂直轴加速度峰值 >3g 且水平轴急剧变化 | 基于行业参考阈值，准确率 >85% 满足MVP要求 |
| 后续迭代 | 机器学习分类器（LSTM/SVM） | V2阶段引入，当前MVP不引入ML训练基础设施 |

**检测流程**：手环三轴传感器 → 前端BLE接收 → 阈值预判断 → 超阈值上报后端 → 后端确认 → 触发SOS通知链路（复用004模块）。

## Complexity Tracking

> 无宪法违规，无需特别说明
