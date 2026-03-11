# 银伴少量真实接入操作手册

## 1. 目标

这份手册服务于当前竞赛阶段的后端接入工作，原则不是一次性把所有第三方能力都接满，而是按“最小投入、最大说服力、尽量真实”的顺序，优先把最值得展示的外部能力接起来。

当前建议顺序固定为：

1. `OSS` 真实上传
2. 微信小程序订阅消息真实发送
3. 阿里云短信真实发送
4. 医疗目录真实化，咨询/预约/报告保持“可切 live、可诊断”
5. DashScope AI/语音作为加分项，不抢前四项节奏

## 2. 你当前项目的接入现状

后端已经具备这些能力，不需要重写：

- 统一运行模式：`COMPETITION_SANDBOX` / `PRODUCTION_LIVE`
- 外部能力 live/stub 自动切换
- 统一能力诊断：`/admin/system/integrations`
- 统一第三方错误记录：`recentErrors`
- 医疗链路统一诊断字段：`source`、`mode`、`fallbackUsed`、`diagnosticId`、`diagnostics`

当前关键代码位置：

- OSS 上传服务：[backend/src/services/ossService.js](/D:/03_Study/Desktop/old/backend/src/services/ossService.js)
- 微信订阅消息：[backend/src/utils/wechatNotifier.js](/D:/03_Study/Desktop/old/backend/src/utils/wechatNotifier.js)
- 医疗 live/stub 服务：[backend/src/services/medicalApiService.js](/D:/03_Study/Desktop/old/backend/src/services/medicalApiService.js)
- 医疗目录真实化缓存层：[backend/src/services/medicalDirectoryService.js](/D:/03_Study/Desktop/old/backend/src/services/medicalDirectoryService.js)
- 系统接入诊断：[backend/src/services/adminOpsService.js](/D:/03_Study/Desktop/old/backend/src/services/adminOpsService.js)
- 运行时环境校验：[backend/src/config/validateEnv.js](/D:/03_Study/Desktop/old/backend/src/config/validateEnv.js)
- Docker 联调环境：[docker-compose.yml](/D:/03_Study/Desktop/old/docker-compose.yml)

## 3. 开始前准备

### 3.1 启动方式

你现在的 MySQL 不再暴露宿主机端口，后续所有后端操作都建议走容器内执行：

```powershell
cd D:\03_Study\Desktop\old
docker-compose up -d --build
docker-compose ps
```

后面所有命令默认都用：

```powershell
docker-compose exec backend <command>
```

### 3.2 环境文件

日常修改的环境文件是：

- [backend/.env](/D:/03_Study/Desktop/old/backend/.env)
- 模板参考：[backend/.env.example](/D:/03_Study/Desktop/old/backend/.env.example)

改完 `.env` 后，建议重启后端容器：

```powershell
cd D:\03_Study\Desktop\old
docker-compose up -d --build backend
```

### 3.3 验证入口

平台接入完成后，优先通过后台系统诊断确认：

- `GET /admin/system/integrations`

这个接口会显示：

- 当前运行模式
- 各外部服务 `configured`
- `mode` / `effectiveMode`
- `fallbackAllowed`
- `missingConfig`
- 最近失败信息

## 4. 推荐接入顺序

### 4.1 第一优先级：OSS 真实上传

这是最值得最先接的能力，因为：

- 开通难度低
- 成本通常低于短信和医疗 API
- 能直接增强家庭空间、语音上传、医疗报告附件这些演示链路
- 你项目里语音 live 也依赖 OSS

#### 4.1.1 官方参考

- 阿里云 OSS 快速开始：[阿里云官方文档](https://help.aliyun.com/zh/oss/developer-reference/quick-start)
- OSS 上传对象：[阿里云官方文档](https://help.aliyun.com/zh/oss/user-guide/upload-objects-to-oss/)
- OSS 计费概述：[阿里云官方文档](https://help.aliyun.com/document_detail/31817.html)

#### 4.1.2 平台侧操作步骤

1. 注册并实名认证阿里云账号。
2. 开通 OSS 服务。
3. 创建一个 Bucket。
4. Bucket 所在地域尽量选国内固定区域，例如杭州或上海。
5. 竞赛阶段建议先用一个单独 Bucket，例如 `yinban-family-space`。
6. 创建一组最小权限 RAM 子账号或 AccessKey，不建议直接长期用主账号密钥。

#### 4.1.3 你项目里要改的环境变量

最推荐的接法是“直接 OSS 配置”，先不额外包一层上传网关：

```env
OSS_MODE=live
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=yinban-family-space
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
OSS_PUBLIC_BASE_URL=
OSS_UPLOAD_API_URL=
OSS_UPLOAD_TOKEN=
```

说明：

- 这套写法会直接走 [ossService.js](/D:/03_Study/Desktop/old/backend/src/services/ossService.js) 的 live 分支。
- 如果你后面自己包了一层上传代理，也可以改用：
  - `OSS_UPLOAD_API_URL`
  - `OSS_UPLOAD_TOKEN`

#### 4.1.4 重启与校验

```powershell
cd D:\03_Study\Desktop\old
docker-compose up -d --build backend
docker-compose exec backend node -e "const svc=require('./src/services/ossService'); console.log(JSON.stringify(svc.getCapabilityReport(),null,2))"
```

理想结果：

- `effectiveMode` 为 `live`
- `liveConfigured` 为 `true`

#### 4.1.5 成功标准

你至少要看到这三件事：

1. `/admin/system/integrations` 里 `oss` 显示 `configured: true`
2. 实际上传返回真实可访问 URL
3. 语音 live 接入不再因为缺 OSS 配置被 `validateEnv` 拦住

### 4.2 第二优先级：微信小程序订阅消息

这项能力对比赛特别重要，因为它直接强化：

- 用药提醒
- 家属漏服通知
- 续药提醒

#### 4.2.1 官方参考

- 获取接口调用凭据 `access_token`：[微信官方文档](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-access-token/getAccessToken.html)
- 发送小程序订阅消息：[微信官方文档](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-message-management/subscribe-message/sendMessage.html)

#### 4.2.2 现实前提

这项接入通常需要：

- 真实可用的小程序主体
- 已配置订阅消息模板
- 用户在前端明确授权订阅

所以它比 OSS 难，但依然比医疗 live 容易。

#### 4.2.3 平台侧操作步骤

1. 登录微信公众平台，进入你的小程序。
2. 确认小程序 `AppID` 和 `AppSecret`。
3. 在订阅消息后台申请并配置模板。
4. 至少准备三类模板：
   - 用药提醒
   - 家属漏服提醒
   - 续药提醒
5. 前端需要发起订阅授权；后端只负责发送。

#### 4.2.4 你项目里要改的环境变量

```env
WECHAT_NOTIFY_MODE=live
WECHAT_NOTIFY_MOCK=0
WX_APPID=你的小程序AppID
WX_APPSECRET=你的小程序AppSecret
WX_ACCESS_TOKEN=临时调试可先手动填入
WECHAT_NOTIFY_API_URL=https://api.weixin.qq.com/cgi-bin/message/subscribe/send
WX_MSG_TEMPLATE_ID=主模板ID
WX_MSG_TEMPLATE_ID_FAMILY=家属模板ID
WX_MSG_TEMPLATE_ID_REFILL=续药模板ID
WX_MSG_TEMPLATE_ID_SECOND=二次提醒模板ID
WECHAT_MINI_PROGRAM_STATE=formal
```

说明：

- 当前项目的 [wechatNotifier.js](/D:/03_Study/Desktop/old/backend/src/utils/wechatNotifier.js) 是直接吃 `WX_ACCESS_TOKEN` 的。
- 也就是说，现阶段你需要先有一个可用 `access_token`。
- 更稳妥的后续做法，是再补一层自动刷新 token 服务，但竞赛阶段可以先人工维护。

#### 4.2.5 重启与校验

```powershell
cd D:\03_Study\Desktop\old
docker-compose up -d --build backend
docker-compose exec backend node -e "const svc=require('./src/utils/wechatNotifier'); console.log(JSON.stringify(svc.getCapabilityReport(),null,2))"
```

理想结果：

- `effectiveMode` 为 `live`
- `missingConfig` 为空

#### 4.2.6 竞赛阶段最务实的做法

如果你已经有小程序主体，但还没做 token 自动刷新，建议这样做：

1. 先打通真实模板发送。
2. 先接受 `WX_ACCESS_TOKEN` 需要人工更新。
3. 答辩时明确说明：
   - 当前已完成真实模板链路验证
   - token 自动刷新属于后续工程化优化项

这比“完全 mock”更有说服力，也比临时重写 token 中台更值。

### 4.3 第三优先级：阿里云短信

短信最适合挂在：

- SOS 兜底提醒
- 极端情况下的二次通知

但它不是第一优先，因为：

- 需要实名认证
- 需要签名审核、模板审核
- 有明确成本
- 在竞赛答辩里，视觉说服力反而通常不如微信消息和 OSS

#### 4.3.1 官方参考

- 短信服务快速开始：[阿里云官方文档](https://help.aliyun.com/zh/sms/getting-started/get-started-with-sms)
- SendSms 调用参考：[阿里云官方文档](https://help.aliyun.com/zh/sms/developer-reference/api-dysmsapi-2017-05-25-sendsms)
- 短信计费与价格说明：[阿里云官方价格页](https://www.aliyun.com/price/product)

#### 4.3.2 平台侧操作步骤

1. 开通阿里云短信服务。
2. 完成实名认证。
3. 申请短信签名。
4. 申请短信模板。
5. 获取 AccessKey。

#### 4.3.3 你项目里要改的环境变量

当前仓库里分两层：

- 通用阿里云短信配置
- SOS 业务通知配置

```env
ALIYUN_ACCESS_KEY_ID=你的AccessKeyId
ALIYUN_ACCESS_KEY_SECRET=你的AccessKeySecret
ALIYUN_SMS_SIGN_NAME=你的短信签名
ALIYUN_SMS_TEMPLATE_CODE=你的通用模板编码

SOS_SMS_NOTIFY_URL=如果你自建短信网关就填
SOS_SMS_TEMPLATE_CODE=SOS_ALERT_TEMPLATE或你的正式模板编码
SOS_SMS_TIMEOUT_MS=5000
SOS_NOTIFY_MAX_RETRY=3
```

说明：

- 当前代码更偏“短信通知壳层”设计。
- 如果你直接接阿里云短信 SDK，建议后面统一封到现有通知服务里，不要让业务层直接调用 SDK。

#### 4.3.4 成功标准

至少满足：

1. SOS 事件触发后能有真实短信发送证据
2. 后台审计能留痕
3. 失败时能在系统诊断里解释，不允许“静默失败”

### 4.4 第四优先级：医疗链路真实化

医疗这块不要一上来追求“全 live 平台打通”，当前最优路线是：

1. 医疗目录尽量真实
2. 咨询/预约做成严格契约壳层
3. 报告优先用脱敏真实样本

#### 4.4.1 官方参考

医疗平台没有统一全国公开标准接口，所以这部分没有一个像微信或阿里云那样的单一官方入口。你这里最应该做的是：

- 优先使用公开可核验的医院、科室、医生目录数据
- 保持第三方医疗平台接入参数化
- 让 live/stub/fallback 诊断对评委透明

#### 4.4.2 当前项目的正确做法

你项目已经做了一个非常适合竞赛的结构：

- [medicalDirectoryService.js](/D:/03_Study/Desktop/old/backend/src/services/medicalDirectoryService.js)
  - 优先读本地缓存
  - 有 live 配置时尝试同步上游
  - live 不可用时退到公开整理目录
- [medicalApiService.js](/D:/03_Study/Desktop/old/backend/src/services/medicalApiService.js)
  - 统一 live/stub/circuit breaker
- [medicalMeta.js](/D:/03_Study/Desktop/old/backend/src/services/medicalMeta.js)
  - 统一输出诊断字段

这套结构已经够竞赛用了，不建议为了“看起来更真实”去推翻。

#### 4.4.3 你项目里要改的环境变量

```env
MEDICAL_API_MODE=auto
MEDICAL_API_BASE_URL=你的医疗平台网关地址
MEDICAL_API_KEY=你的平台密钥
MEDICAL_API_AUTH_MODE=bearer
MEDICAL_API_TIMEOUT_MS=5000
MEDICAL_API_MAX_RETRY=2
MEDICAL_API_CIRCUIT_BREAKER_THRESHOLD=3
MEDICAL_API_CIRCUIT_BREAKER_COOLDOWN_MS=30000
MEDICAL_API_ALLOW_STUB_FALLBACK=true
```

建议分两步：

1. 先把目录数据替换成更真实的公开整理数据
2. 再逐步对接 live 咨询/预约

#### 4.4.4 成功标准

你不必追求“每个医疗接口都 live”，但必须做到：

1. 目录数据不是硬编码幻想医院
2. `source` / `mode` / `fallbackUsed` / `diagnostics` 全部对外诚实可见
3. fallback 只在上游不可用时触发
4. 报告样本尽量脱敏真实

### 4.5 第五优先级：DashScope AI 与语音

这块是竞赛加分项，不是第一顺位，但项目里其实已经准备得比较好了。

#### 4.5.1 官方参考

- 阿里云百炼 DashScope 文档入口：[阿里云官方文档](https://help.aliyun.com/zh/model-studio/)

#### 4.5.2 你项目里的对应能力

- AI 咨询：[backend/src/services/aiService.js](/D:/03_Study/Desktop/old/backend/src/services/aiService.js)
- 语音服务：[backend/src/services/voiceService.js](/D:/03_Study/Desktop/old/backend/src/services/voiceService.js)

#### 4.5.3 你项目里要改的环境变量

```env
AI_CONSULT_MODE=live
VOICE_SERVICE_MODE=live
DASHSCOPE_API_KEY=你的DashScope密钥
QWEN_MODEL=qwen-turbo
```

如果你要启语音 live，还要先保证 OSS live 已经通了，否则 [validateEnv.js](/D:/03_Study/Desktop/old/backend/src/config/validateEnv.js) 会直接阻止启动。

## 5. 每接完一项都怎么验收

每完成一项真实接入，都按这个固定顺序验收：

### 5.1 看容器是否正常

```powershell
cd D:\03_Study\Desktop\old
docker-compose ps
docker-compose logs backend --tail=200
```

### 5.2 看系统诊断

登录后台管理员后，查看：

- `GET /admin/system/integrations`

重点看：

- `configured`
- `effectiveMode`
- `missingConfig`
- `recentErrors`

### 5.3 跑真实业务链路

推荐最小验收：

- OSS：上传一张图片或一段音频
- 微信：触发一次用药提醒或家属提醒
- 短信：触发一次 SOS 通知
- 医疗：拉一次医院目录、科室、医生详情
- AI/语音：发起一次咨询或语音识别

### 5.4 固定证据

每完成一项真实接入，都建议立刻留存：

1. 平台控制台截图
2. `.env` 已填字段清单，但不要暴露密钥
3. `/admin/system/integrations` 返回截图
4. 一次真实请求成功结果
5. 一次失败时的可解释诊断结果

## 6. 最省钱的竞赛版组合

如果你现在预算有限，最推荐的组合不是“全接”，而是：

1. 真实 OSS
2. 真实微信订阅消息
3. 医疗目录真实化
4. 医疗报告用脱敏真实样本
5. 短信先不强行上
6. 医疗 live 平台先不强行上

这套组合的优势是：

- 花钱点更少
- 实际说服力足够强
- 技术路线诚实
- 不容易在比赛前被外部平台审批节奏拖死

## 7. 不建议现在做的事

当前阶段不建议：

- 为了 live 接入重构后端架构
- 直接把 `PRODUCTION_LIVE=1` 全量打开
- 医疗接口还没拿到正式平台前就伪装成“已全 live”
- 在业务层散落地直接调用第三方 SDK
- 为了短信而牺牲 OSS 或微信这两个更高性价比能力

## 8. 推荐执行清单

按顺序做：

1. 开通阿里云 OSS，填好 OSS live 配置。
2. 重启 backend，确认 `oss` 在 `/admin/system/integrations` 里转为 live。
3. 开通并配置微信订阅消息模板，填好 `WX_ACCESS_TOKEN` 和模板 ID。
4. 跑一次真实用药提醒或家属提醒。
5. 用公开真实目录替换或补充现有医疗目录数据。
6. 如果资源允许，再接阿里云短信。
7. 最后再考虑医疗 live 平台和 DashScope 语音全 live。

## 9. 你现在最该先做哪一步

如果我们只做一件最值的事，就先做：

1. `OSS` 真实上传

做完它以后，你的收益最大：

- 家庭空间附件能变真
- 语音 live 具备前置条件
- 医疗报告附件链更可信
- 成本和审批压力都比短信、医疗平台低

## 10. 参考链接

- 微信小程序获取 `access_token`：[官方文档](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-access-token/getAccessToken.html)
- 微信小程序发送订阅消息：[官方文档](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-message-management/subscribe-message/sendMessage.html)
- 阿里云 OSS 快速开始：[官方文档](https://help.aliyun.com/zh/oss/developer-reference/quick-start)
- 阿里云 OSS 上传对象：[官方文档](https://help.aliyun.com/zh/oss/user-guide/upload-objects-to-oss/)
- 阿里云 OSS 计费概述：[官方文档](https://help.aliyun.com/document_detail/31817.html)
- 阿里云短信服务快速开始：[官方文档](https://help.aliyun.com/zh/sms/getting-started/get-started-with-sms)
- 阿里云短信 SendSms 接口：[官方文档](https://help.aliyun.com/zh/sms/developer-reference/api-dysmsapi-2017-05-25-sendsms)
- 阿里云产品价格页：[官方页面](https://www.aliyun.com/price/product)
