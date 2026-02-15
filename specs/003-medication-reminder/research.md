# Research: 智慧用药提醒

## 研究目标

确定003智慧用药提醒功能的技术实现方案，包括：
1. 定时提醒机制
2. 微信服务通知
3. 服药记录存储

---

## Decision 1: 定时提醒机制

**Decision**: 后端定时任务 + Redis任务队列

**Rationale**:
- node-cron提供可靠的定时任务调度
- Redis队列保证提醒不丢失
- 支持高并发场景

**Implementation**:
```javascript
const cron = require('node-cron');

// 每分钟执行一次，检查需要发送的提醒
cron.schedule('* * * * *', async () => {
  const pendingReminders = await getPendingReminders();
  for (const reminder of pendingReminders) {
    await sendReminder(reminder);
  }
});
```

---

## Decision 2: 微信服务通知

**Decision**: 微信小程序订阅消息

**Rationale**:
- 微信官方推送渠道，到达率高
- 首次添加用药计划时引导用户订阅
- 支持模板消息

**Implementation**:
```javascript
const wechatNotify = require('./utils/wechat-notify');

// 发送用药提醒
await wechatNotify.send({
  templateId: 'xxx',
  touser: user.openid,
  data: {
    thing1: { value: '降压药' },
    time2: { value: '08:00' }
  }
});
```

---

## Decision 3: 服药记录存储

**Decision**: MySQL存储 + Redis缓存

**Rationale**:
- 服药记录需要长期存储，用MySQL
- 今日提醒缓存用Redis，提升查询性能

---

## 结论

| 技术选型 | 方案 |
|----------|------|
| 定时任务 | node-cron + Redis队列 |
| 推送渠道 | 微信服务通知 |
| 数据存储 | MySQL + Redis |
