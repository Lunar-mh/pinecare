# Research: GPS定位追踪

## 研究目标

确定014 GPS定位追踪功能的技术实现方案。

---

## Decision 1: 定位方式

**Decision**: 微信小程序定位API + 基站定位

**Sources**:
- GPS定位（户外精度高）
- WiFi定位（室内可用）
- 基站定位（辅助补充）

---

## Decision 2: 电子围栏

**Decision**: 圆形/多边形区域

**Features**:
- 离开提醒
- 进入提醒
- 自定义区域

---

## Decision 3: 轨迹存储

**Decision**: 精简坐标点存储

**Strategy**:
- 实时位置：Redis缓存
- 历史轨迹：MySQL存储
- 采样间隔：5分钟
