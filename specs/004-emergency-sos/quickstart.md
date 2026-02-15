# Quickstart: 一键紧急救援

## 核心代码

### 触发SOS

```javascript
// pages/index/sos.js
Page({
  triggerSOS() {
    // 5秒倒计时确认
    let countdown = 5;
    const timer = setInterval(() => {
      countdown--;
      if (countdown === 0) {
        clearInterval(timer);
        this.sendSOS();
      }
    }, 1000);
  },

  async sendSOS() {
    // 获取位置
    const location = await wx.getLocation();
    
    // 调用API
    await Taro.request({
      url: '/api/v1/sos/trigger',
      method: 'POST',
      data: {
        latitude: location.latitude,
        longitude: location.longitude
      }
    });

    // 显示拨打120界面
    wx.makePhoneCall({ phoneNumber: '120' });
  }
});
```

## API接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /sos/trigger | 触发SOS |
| POST | /sos/cancel | 取消SOS |
| GET | /sos/history | SOS历史 |
