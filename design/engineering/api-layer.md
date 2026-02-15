# API Client 分层（规划）

## 目标
让80+页面、约83~93个API端点的调用具备一致的错误处理、鉴权、重试与弱网兜底。

## 约束
- 端点总数与清单以 `specs/*/contracts/openapi.yaml` 为准；当前约83~93（待核验）

## 分层
- `services/http/`：request封装（超时、错误码映射、重试策略：待核验）
- `services/modules/`：按模块拆分（auth/health/medication/sos/family/voice/...）
- `services/cache/`：必要缓存（例如今日健康数据；具体策略待核验）

## 错误与兜底
- 必须提供：大字错误提示 + 明确下一步（重试/返回）
- 不允许仅显示“失败”或仅红色描边

## 验收
- 弱网/断网时：页面不崩溃，错误态可见可操作（按钮热区达标）。
