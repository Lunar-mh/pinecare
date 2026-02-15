# Research: 一键紧急救援

## 研究目标

确定004一键紧急救援功能的技术实现方案。

---

## Decision 1: 通知机制

**Decision**: 微信服务通知 + 短信双通道

**Rationale**:
- 微信服务通知为主，实时推送
- 短信作为备用，确保送达
- 紧急情况需要高可靠性

---

## Decision 2: 位置获取

**Decision**: 微信小程序wx.getLocation API

**Rationale**:
- 官方API，稳定可靠
- GPS+WiFi混合定位
- 需要用户授权

---

## 结论

| 技术选型 | 方案 |
|----------|------|
| 通知推送 | 微信服务通知 + 短信 |
| 位置获取 | wx.getLocation API |
| 拨打120 | wx.makePhoneCall |
