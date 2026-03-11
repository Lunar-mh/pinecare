# SOS 真实通知接入说明

## 1. 当前实现变化

这次已经把 SOS 通知链改成了“双路径”：

1. 如果配置了外部网关地址，继续沿用外部 webhook。
2. 如果没有配置外部网关，但已经配好微信或阿里云短信参数，后端会直接发送。

对应实现：

- [smsNotifyService.js](/D:/03_Study/Desktop/old/backend/src/services/smsNotifyService.js)
- [wechatNotifyService.js](/D:/03_Study/Desktop/old/backend/src/services/wechatNotifyService.js)
- [sosSmsDirectService.js](/D:/03_Study/Desktop/old/backend/src/services/sosSmsDirectService.js)
- [sosWechatDirectService.js](/D:/03_Study/Desktop/old/backend/src/services/sosWechatDirectService.js)

## 2. 最推荐的配置方式

### 2.1 SOS 微信通知

如果你已经把微信订阅消息主链配好了，现在 SOS 微信最推荐直接走内置直连。

在 [backend/.env](/D:/03_Study/Desktop/old/backend/.env) 里补：

```env
SOS_WECHAT_MODE=live
SOS_WECHAT_NOTIFY_URL=
SOS_WX_MSG_TEMPLATE_ID=你的SOS模板ID
SOS_WECHAT_PAGE=pages/sos/index
SOS_WX_FIELD_CONTACT=thing1
SOS_WX_FIELD_ADDRESS=thing2
SOS_WX_FIELD_TIME=time3
SOS_WX_FIELD_COORDS=thing4
```

说明：

- `SOS_WECHAT_NOTIFY_URL` 留空时，后端会直接走微信 API。
- `SOS_WX_MSG_TEMPLATE_ID` 建议单独为 SOS 准备，不要和普通用药提醒复用。
- 字段名默认用了 `thing1/thing2/time3/thing4`，你的模板要和这个结构对上。

### 2.2 SOS 短信通知

如果你准备接阿里云短信，建议直接走内置直连。

在 [backend/.env](/D:/03_Study/Desktop/old/backend/.env) 里补：

```env
SOS_SMS_MODE=live
SOS_SMS_PROVIDER=aliyun
SOS_SMS_NOTIFY_URL=
SOS_SMS_SIGN_NAME=你的短信签名
SOS_SMS_TEMPLATE_CODE=你的SOS模板编码
SOS_SMS_API_URL=https://dysmsapi.aliyuncs.com/
SOS_SMS_REGION_ID=cn-hangzhou
ALIYUN_ACCESS_KEY_ID=你的AccessKeyId
ALIYUN_ACCESS_KEY_SECRET=你的AccessKeySecret
```

说明：

- `SOS_SMS_NOTIFY_URL` 留空时，后端会直接请求阿里云短信接口。
- `SOS_SMS_SIGN_NAME` 如果不填，会回退到 `ALIYUN_SMS_SIGN_NAME`。
- `SOS_SMS_TEMPLATE_CODE` 如果不填，会回退到 `ALIYUN_SMS_TEMPLATE_CODE`。

## 3. 如果你还想保留外部网关

也可以继续使用：

```env
SOS_SMS_NOTIFY_URL=http://你的网关/sms
SOS_WECHAT_NOTIFY_URL=http://你的网关/wechat
```

只要填了这两个地址，后端就优先转发，不走内置直连。

## 4. 验证方式

改完环境变量后重启：

```powershell
cd D:\03_Study\Desktop\old
docker-compose up -d --build backend
```

然后看系统诊断：

```powershell
Invoke-RestMethod http://localhost:3001/api/v1/admin/system/integrations -Headers @{ Authorization = 'Bearer 你的管理员Token' }
```

重点查看新增两项：

- `sos_sms_notify`
- `sos_wechat_notify`

你希望看到：

- `configured = true`
- `effectiveMode = live` 或 `webhook`
- `missingConfig` 尽量为空

## 5. 竞赛阶段建议

最优顺序：

1. 先开 SOS 微信通知直连
2. 再开 SOS 短信直连
3. 如果短信审批慢，比赛阶段也可以只用微信直连 + 后台审计 + 队列重试证明

这样性价比最高，也最贴合你现在已经配置好的微信能力。
