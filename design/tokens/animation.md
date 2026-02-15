# 动画系统（Animation System）

## 动画原则

### 适老化动画指南
- **持续时间**: 稍长于常规（0.3-0.5s），给老年人足够时间感知
- **缓动函数**: 使用 ease-in-out，开始和结束都柔和
- **减少动效**: 提供 `prefers-reduced-motion` 支持
- **避免眩晕**: 不使用旋转、缩放过大的动画

## 时间规范

### 持续时间

| 类型 | 时长 | 用途 |
|------|------|------|
| `duration.fast` | 150ms | 微交互、按钮反馈 |
| `duration.normal` | 300ms | 标准过渡、页面切换 |
| `duration.slow` | 500ms | 复杂动画、提示信息 |

### 缓动函数

| 名称 | 值 | 用途 |
|------|-----|------|
| `ease.default` | `ease` | 默认过渡 |
| `ease.in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | 对称动画 |
| `ease.out` | `cubic-bezier(0, 0, 0.2, 1)` | 进入动画 |
| `ease.in` | `cubic-bezier(0.4, 0, 1, 1)` | 退出动画 |

## 动画类型

### 1. 微交互（Micro-interactions）

#### 按钮按下
```css
transition: transform 0.15s ease, box-shadow 0.15s ease;

&:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
```

#### 输入框聚焦
```css
transition: border-color 0.2s ease, box-shadow 0.2s ease;

&:focus {
  border-color: #01579b;
  box-shadow: 0 0 0 3px rgba(1, 87, 155, 0.1);
}
```

### 2. 页面过渡

#### 页面进入
```css
@keyframes pageEnter {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

animation: pageEnter 0.3s ease-out;
```

#### 卡片出现
```css
@keyframes cardAppear {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

animation: cardAppear 0.4s ease-out;
```

### 3. 加载动画

#### 旋转加载
```css
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-spinner {
  animation: spin 0.8s linear infinite;
}
```

#### 脉冲效果
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.loading-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}
```

### 4. 反馈动画

#### 成功提示
```css
@keyframes successPop {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.success-icon {
  animation: successPop 0.4s ease-out;
}
```

#### 错误震动
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.error-input {
  animation: shake 0.3s ease-in-out;
}
```

## 无障碍支持

### 减少动效
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 性能优化

- **使用 transform 和 opacity**: 避免触发重排
- **will-change**: 对频繁动画的元素使用
- **GPU 加速**: 使用 `transform: translateZ(0)`

## 动画顺序

页面加载时动画的推荐顺序：
1. 页面背景（0ms）
2. 导航栏（100ms delay）
3. 主要内容卡片（200ms delay,  stagger 100ms）
4. 操作按钮（400ms delay）
