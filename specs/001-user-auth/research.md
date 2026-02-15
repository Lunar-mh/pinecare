# Research: 用户注册与身份认证

## 研究目标

确定001用户注册登录功能的技术实现方案，包括：
1. 微信小程序登录流程
2. 短信验证码服务选型
3. 用户认证方案

---

## Decision 1: 微信小程序登录

**Decision**: 采用微信wx.login + code2Session标准流程

**Rationale**: 
- 微信官方标准方案，安全可靠
- 获取openid用于用户唯一标识
- session_key用于解密用户敏感数据

**Alternatives considered**:
- 自行实现登录流程 - 安全性低，不推荐
- 仅使用手机号登录 - 部分老人无手机号，需微信登录作为补充

**Implementation**:
```javascript
// 后端调用微信code2Session
const response = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
  params: {
    appid: APP_ID,
    secret: APP_SECRET,
    js_code: code,
    grant_type: 'authorization_code'
  }
});
// 返回 openid, session_key
```

**Security Note** (来自研究):
- session_key必须存服务端，绝不能返回给客户端
- 使用HTTPS加密传输
- 验证码单次使用，5分钟有效期

---

## Decision 2: 短信验证码服务

**Decision**: 阿里云短信服务 + Redis存储验证码

**Rationale**:
- 国内主流短信服务，到达率高(98%)
- Redis存储验证码，支持过期自动失效
- 支持频率限制（每天每号10次）

**Alternatives considered**:
- 腾讯云短信 - 到达率99%更高，QPS更高(3000/s)，但价格略贵
- 自建短信网关 - 成本高，不推荐

**Comparison**:
| 指标 | 阿里云 | 腾讯云 |
|------|--------|--------|
| 到达率 | 98% | 99% |
| QPS | 1000/s | 3000/s |
| 价格 | ¥0.01-0.032/条 | ¥0.039-0.047/条 |

**Implementation**:
```javascript
// 生成6位验证码
const code = Math.floor(100000 + Math.random() * 900000).toString();
// 存入Redis，5分钟过期
await redis.setex(`sms:code:${phone}`, 300, code);
// 发送短信
await aliyunSMS.send({ phone, code });
```

---

## Decision 3: 用户认证方案

**Decision**: JWT Token方案 + Refresh Token刷新机制

**Rationale**:
- 无状态，适合分布式部署
- 小程序本地存储token方便
- 支持refresh token机制续期

**Token配置**:
- Access Token: 15分钟有效期，存内存
- Refresh Token: 7天有效期，存加密存储，支持轮换

**Alternatives considered**:
- Session方案 - 需要Redis存储，不适合跨服务
- 简单token - 安全性低

**Implementation**:
```javascript
// 生成JWT
const token = jwt.sign(
  { userId, openid, role: 'elder' },
  JWT_SECRET,
  { expiresIn: '7d' }
);

// 验证JWT
const decoded = jwt.verify(token, JWT_SECRET);
```

---

## 结论

| 技术选型 | 方案 |
|----------|------|
| 微信登录 | wx.login + code2Session |
| 短信验证码 | 阿里云短信 + Redis |
| 用户认证 | JWT Token + Refresh Token |
| 密码加密 | bcrypt |
