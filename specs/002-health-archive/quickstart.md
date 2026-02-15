# Quickstart: 全维健康档案基础版

## 环境准备

### 1. 安装依赖

```bash
# 后端依赖
npm install express mysql2 ioredis dotenv

# 前端依赖
npm install echarts echarts-for-taro
```

### 2. 环境变量配置

```env
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=yinban

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. 数据库初始化

```sql
-- 健康档案表
CREATE TABLE health_archives (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
);

-- 健康指标记录表
CREATE TABLE health_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  metric_type ENUM('blood_pressure','heart_rate','blood_oxygen','steps','sleep','blood_sugar','temperature') NOT NULL,
  value VARCHAR(64) NOT NULL,
  value_high INT NULL,
  value_low INT NULL,
  source ENUM('device','manual') DEFAULT 'device',
  device_id BIGINT NULL,
  measured_at DATETIME NOT NULL,
  synced_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES device_bindings(id) ON DELETE SET NULL,
  INDEX idx_user_metric (user_id, metric_type, measured_at),
  INDEX idx_user_date (user_id, measured_at)
);

-- 设备绑定表
CREATE TABLE device_bindings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  device_name VARCHAR(64) NOT NULL,
  device_mac VARCHAR(17) NULL,
  device_type VARCHAR(32) NOT NULL,
  is_primary TINYINT DEFAULT 0,
  battery_level TINYINT NULL,
  bind_status ENUM('bound','unbound') DEFAULT 'bound',
  last_sync_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, bind_status)
);
```

---

## 核心代码

### 1. 微信小程序蓝牙连接

```javascript
// pages/device/sync.js - 手环数据同步
Page({
  data: {
    devices: [],
    connectedDevice: null,
  },

  // 初始化蓝牙
  initBluetooth() {
    wx.openBluetoothAdapter({
      success: () => this.startDiscovery(),
      fail: (err) => wx.showToast({ title: '请开启蓝牙', icon: 'none' })
    });
  },

  // 搜索设备
  startDiscovery() {
    wx.startBluetoothDevicesDiscovery({
      success: () => {
        wx.onBluetoothDeviceFound((res) => {
          // 过滤目标设备
          const devices = res.devices.filter(d => 
            d.name && d.name.includes('手环')
          );
          this.setData({ devices });
        });
      }
    });
  },

  // 连接设备
  connectDevice(e) {
    const deviceId = e.currentTarget.dataset.id;
    wx.createBLEConnection({
      deviceId,
      success: () => this.getServices(deviceId)
    });
  },

  // 获取服务并订阅数据
  getServices(deviceId) {
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        // 获取心率服务 UUID
        const heartRateService = res.services.find(s => 
          s.uuid.includes('180D') // 心率服务
        );
        if (heartRateService) {
          this.getCharacteristics(deviceId, heartRateService.uuid);
        }
      }
    });
  },

  getCharacteristics(deviceId, serviceId) {
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        // 订阅特征值
        const notify = res.characteristics.find(c => 
          c.properties.notify
        );
        if (notify) {
          wx.notifyBLECharacteristicValueChange({
            deviceId,
            serviceId,
            characteristicId: notify.uuid,
            state: true
          });
        }
      }
    });
  },

  // 接收数据
  onDataReceived() {
    wx.onBLECharacteristicValueChange((res) => {
      // 解析心率数据
      const data = new Uint8Array(res.value);
      const heartRate = data[0];
      // 上传服务器
      this.uploadHealthData('heart_rate', heartRate);
    });
  },

  uploadHealthData(type, value) {
    wx.request({
      url: 'https://api.yinban.com/v1/health/sync',
      method: 'POST',
      header: { Authorization: `Bearer ${token}` },
      data: {
        device_id: this.data.connectedDeviceId,
        data: [{
          metric_type: type,
          value: value.toString(),
          source: 'device',
          measured_at: new Date().toISOString()
        }]
      }
    });
  }
});
```

### 2. 健康数据大字展示

```javascript
// pages/health/index.vue - 使用Taro
import Taro from '@tarojs/taro';
import * as echarts from 'echarts';

export default {
  data() {
    return {
      healthData: {}
    }
  },

  onLoad() {
    this.fetchTodayData();
  },

  async fetchTodayData() {
    const res = await Taro.request({
      url: '/api/v1/health/today',
      header: { Authorization: `Bearer ${token}` }
    });
    this.setData({ healthData: res.data });
  },

  // 渲染大字指标卡片
  renderMetricCard(title, value, unit, isAbnormal) {
    return {
      title,
      value,
      unit,
      isAbnormal,
      // 适老化设计：36sp以上字体
      fontSize: '48rpx',
      color: isAbnormal ? '#FF4D4F' : '#333'
    };
  }
}
```

### 3. 趋势图表

```javascript
// 折线图配置
const getLineChartOption = (data) => ({
  xAxis: {
    type: 'time',
    data: data.map(d => d.measured_at)
  },
  yAxis: {
    type: 'value',
    name: 'mmHg'
  },
  series: [{
    type: 'line',
    data: data.map(d => d.value_high),
    itemStyle: { color: '#FF6B6B' }, // 收缩压红色
    name: '收缩压'
  }, {
    type: 'line',
    data: data.map(d => d.value_low),
    itemStyle: { color: '#4ECDC4' }, // 舒张压青色
    name: '舒张压'
  }],
  tooltip: {
    trigger: 'axis'
  },
  legend: {
    data: ['收缩压', '舒张压']
  }
});
```

---

## API接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health/today | 获取今日健康数据 |
| GET | /api/health/trend | 获取健康数据趋势 |
| POST | /api/health/manual | 手动录入健康数据 |
| POST | /api/health/sync | 同步手环数据 |
| POST | /api/device/bind | 绑定设备 |
| POST | /api/device/unbind | 解绑设备 |
| GET | /api/device/list | 获取设备列表 |
| POST | /api/device/set-primary | 设置主设备 |

---

## 常见问题

### Q: 手环连接失败？
A: 确保手机蓝牙已开启，手环在手机附近，检查手环是否支持蓝牙4.0+

### Q: 数据同步失败？
A: 检查网络连接，确保手环电量充足，尝试重新配对

### Q: 血压数据异常？
A: 确保测量姿势正确，多次测量取平均值，异常数据会红色高亮显示
