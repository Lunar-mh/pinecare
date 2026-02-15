# 阴影系统（Shadow System）

## 阴影层级

阴影用于表达元素的层级关系，帮助用户理解界面结构。

### 基础阴影

| Token | 阴影值 | 用途 |
|-------|--------|------|
| `shadow.sm` | `0 2px 4px rgba(0,0,0,0.05)` | 轻微提升，标签、小按钮 |
| `shadow.md` | `0 4px 8px rgba(0,0,0,0.08)` | 标准卡片、输入框 |
| `shadow.lg` | `0 8px 16px rgba(0,0,0,0.12)` | 模态框、下拉菜单 |
| `shadow.xl` | `0 12px 24px rgba(0,0,0,0.15)` | 对话框、悬浮按钮 |

### 专用阴影

| Token | 阴影值 | 用途 |
|-------|--------|------|
| `shadow.card` | `0 4px 12px rgba(0,0,0,0.1)` | 卡片默认阴影 |
| `shadow.button` | `0 4px 12px rgba(0,0,0,0.15)` | 按钮阴影 |
| `shadow.float` | `0 8px 24px rgba(0,0,0,0.12)` | 悬浮操作按钮 |
| `shadow.header` | `0 2px 8px rgba(0,0,0,0.06)` | 顶部导航阴影 |

## 阴影使用原则

### 层级感
- **z-index 0**: 页面背景，无阴影
- **z-index 1**: 卡片、面板，`shadow.card`
- **z-index 2**: 按钮、输入框，`shadow.button`
- **z-index 3**: 下拉菜单、提示，`shadow.lg`
- **z-index 4**: 模态框、对话框，`shadow.xl`

### 适老化考虑
- **阴影不过重**: 避免过深的阴影造成视觉混乱
- **保持清晰**: 阴影边缘柔和但不模糊
- **对比度**: 阴影不影响文字可读性

### 动画中的阴影
- **悬停状态**: 阴影加深，轻微上浮
- **按下状态**: 阴影变浅，贴近表面
- **过渡时间**: 0.2s ease

## 代码示例

```scss
// 卡片
.card {
  box-shadow: $shadow-card;
  transition: box-shadow 0.2s ease;
  
  &:hover {
    box-shadow: $shadow-lg;
  }
}

// 按钮
.button {
  box-shadow: $shadow-button;
  
  &:active {
    box-shadow: $shadow-sm;
    transform: translateY(1px);
  }
}
```
