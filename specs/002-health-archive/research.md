# Research: 全维健康档案基础版

## 研究目标

确定002全维健康档案功能的技术实现方案，包括：
1. 微信小程序蓝牙BLE对接
2. 健康数据图表可视化
3. 手环数据格式

---

## Decision 1: 微信小程序蓝牙连接

**Decision**: 采用微信小程序原生BLE API + "批量采集+同步"模式

**Rationale**:
- 微信原生BLE API成熟稳定
- 批量模式解决后台连接断开问题
- 华为/小米/荣耀手环均支持蓝牙4.0+

**Implementation**:
```javascript
// 微信小程序蓝牙连接流程
wx.openBluetoothAdapter()  // 初始化蓝牙
wx.startBluetoothDevicesDiscovery()  // 搜索设备
wx.createBLEConnection()  // 连接设备
wx.notifyBLECharacteristicValueChange()  // 订阅特征值变化
wx.onBLECharacteristicValueChange()  // 接收数据
```

---

## Decision 2: 健康数据图表

**Decision**: ECharts小程序适配版

**Rationale**:
- ECharts是成熟图表库，有微信小程序适配版
- 支持折线图、柱状图等多种类型
- 性能良好，适合移动端

**Alternatives considered**:
- uCharts - 轻量但功能较少
- wx-charts - 已停止维护

---

## Decision 3: 数据存储方案

**Decision**: MySQL存储 + Redis缓存

**Rationale**:
- 健康数据需要长期存储和分析，用MySQL
- 实时数据用Redis缓存，提升查询性能
- 数据保留3年

---

## 结论

| 技术选型 | 方案 |
|----------|------|
| 蓝牙连接 | 微信原生BLE API |
| 图表展示 | ECharts小程序版 |
| 数据存储 | MySQL + Redis |
| 数据保留 | 3年 |
