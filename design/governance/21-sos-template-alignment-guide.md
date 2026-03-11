# SOS 模板字段对齐操作手册

## 1. 目标

这一步的目标不是立即真发，而是先确认两件事：

1. 阿里云短信模板字段和后端实际提交的 `TemplateParam` 完全一致。
2. 微信订阅消息模板字段编码和后端实际提交的 `data` 完全一致。

只要这一步对齐，后面打开 `live` 就会稳很多。

## 2. 本轮新增的本地预览命令

已新增：

```powershell
cd D:\03_Study\Desktop\old\backend
npm run sos:preview:payload
```

它会输出两部分：

- `sms.preview`
- `wechat.preview`

以及当前能力判断：

- `sms.capability`
- `wechat.capability`

核心脚本：

- [previewSosNotifyPayload.js](/D:/03_Study/Desktop/old/backend/scripts/previewSosNotifyPayload.js)

## 3. 阿里云短信模板对齐

后端当前提交的短信模板变量固定是：

```json
{
  "event_id": "SOS-DEMO-001",
  "contact_name": "家属张女士",
  "address": "陕西省延安市宝塔区枣园路社区",
  "latitude": "36.5852",
  "longitude": "109.4897",
  "triggered_at": "2026-03-11 20:30:00"
}
```

这意味着你在阿里云短信模板里，变量名也应该按这套来设计。最稳做法是短信模板正文里直接使用：

- `${event_id}`
- `${contact_name}`
- `${address}`
- `${latitude}`
- `${longitude}`
- `${triggered_at}`

推荐短信文案方向：

```text
银伴紧急提醒：{contact_name} 绑定长辈触发 SOS。位置：{address}（{latitude},{longitude}），时间：{triggered_at}，事件号：{event_id}。
```

配置位置：

- [backend/.env](/D:/03_Study/Desktop/old/backend/.env)

关键项：

```env
SOS_SMS_MODE=live
SOS_SMS_NOTIFY_URL=
SOS_SMS_SIGN_NAME=你的短信签名
SOS_SMS_TEMPLATE_CODE=你的SOS模板编码
```

## 4. 微信订阅消息模板对齐

后端当前提交的微信 payload 结构是：

```json
{
  "thing1": { "value": "家属张女士" },
  "thing2": { "value": "陕西省延安市宝塔区枣园路社区" },
  "time3": { "value": "2026-03-11 20:30:00" },
  "thing4": { "value": "36.5852,109.4897" }
}
```

默认字段映射如下：

- `thing1` -> 联系人/守护人名称
- `thing2` -> 地址
- `time3` -> 触发时间
- `thing4` -> 经纬度字符串

所以你在微信订阅消息模板平台里，最稳的方式是选一套字段编码能够对应：

- 一个 `thing` 字段承载联系人
- 一个 `thing` 字段承载地址
- 一个 `time` 字段承载时间
- 一个 `thing` 字段承载坐标

配置位置：

- [backend/.env](/D:/03_Study/Desktop/old/backend/.env)

关键项：

```env
SOS_WECHAT_MODE=live
SOS_WECHAT_NOTIFY_URL=
SOS_WX_MSG_TEMPLATE_ID=你的SOS订阅消息模板ID
SOS_WECHAT_PAGE=pages/sos/index
SOS_WX_FIELD_CONTACT=thing1
SOS_WX_FIELD_ADDRESS=thing2
SOS_WX_FIELD_TIME=time3
SOS_WX_FIELD_COORDS=thing4
```

如果你的模板字段不是这套编码，也没关系，直接改这 4 个环境变量，让它对齐你的模板实际编码即可。

例如如果你的模板是：

- 联系人：`name1`
- 地址：`thing6`
- 时间：`time2`
- 坐标：`thing7`

那就改成：

```env
SOS_WX_FIELD_CONTACT=name1
SOS_WX_FIELD_ADDRESS=thing6
SOS_WX_FIELD_TIME=time2
SOS_WX_FIELD_COORDS=thing7
```

## 5. 推荐操作顺序

### 第一步：先看本地预览

```powershell
cd D:\03_Study\Desktop\old\backend
npm run sos:preview:payload
```

### 第二步：拿输出去对照你的短信模板和微信模板

确认：

- 阿里云短信模板变量名一致
- 微信字段编码一致

### 第三步：填好 `.env`

### 第四步：重启后端

```powershell
cd D:\03_Study\Desktop\old
docker-compose up -d --build backend
```

### 第五步：看系统诊断

```powershell
Invoke-RestMethod http://localhost:3001/admin/system/integrations
```

重点确认：

- `sos_sms_notify.effectiveMode = live`
- `sos_wechat_notify.effectiveMode = live`
- `missingConfig` 尽量为空

## 6. 竞赛阶段最稳建议

先把微信模板对齐并打通，再打通短信。

原因是：

1. 你已经有微信相关配置基础。
2. 微信订阅消息更适合做比赛演示闭环。
3. 短信模板审核和签名审核有时会更慢。

所以建议顺序是：

1. 微信模板字段对齐
2. 微信 `live` 诊断变绿
3. 阿里云短信模板变量对齐
4. 短信 `live` 诊断变绿

## 7. 完成标志

这一步真正完成，不是只看 `.env` 填完，而是同时满足：

1. `npm run sos:preview:payload` 输出字段和你的模板完全一致。
2. `/admin/system/integrations` 显示 `sos_sms_notify` / `sos_wechat_notify` 已配置完成。
3. 触发一次真实或半真实 SOS 时，系统日志里没有 `missingConfig` 或字段不匹配错误。
