---
name: taro-react-elderly-ui
description: 银伴微信小程序端（Taro 4 + React 18 + NutUI + Tailwind）专属适老化跨端开发技能。包含分包体积红线管控（主包<=2MB）、老人与家属双模式动态切换、大字号与大触控热区、语音优先交互、低功耗蓝牙（BLE）健康设备直连与弱网防御。
---

# 银伴适老小程序跨端开发技能 (Taro React Elderly UI)

本技能专为**银伴微信小程序端（`frontend/`）**量身定制。依托 Taro 4、React 18、NutUI React Taro (`@nutui/nutui-react-taro`) 与 `weapp-tailwindcss`，实现符合国家适老化与无障碍标准的极致用户体验。

---

## 1. 小程序分包与包体硬约束 (Package Size Guardrails)

微信小程序平台对包体积存在硬性上限：**主包 ≤ 2MB，单个分包 ≤ 2MB，整包 ≤ 20MB**。

### 1.1 架构分包规划
- **主包 (`src/pages/`)**：
  - 仅保留核心框架页面：首页 Dashboard、登录认证、个人中心、角色切换（老人/家属）、关于与协议。
- **业务独立分包 (`src/subpackages/`)**：
  - 各高复杂度功能按独立分包隔离：
    - `health/`：健康档案、体征趋势、健康报表
    - `medication/`：用药日历、用药提醒、服药打卡
    - `sos/`：一键求助、紧急联系人、求助记录
    - `location/`：GPS 实时轨迹、电子围栏
    - `voice_ai/`：语音助手、智能伴聊
    - `medical/`：就医预约、挂号、检查报告
    - `timebank/`：时间银行、志愿积分互助
- **静态资源分包化**：
  - 各分包专用的图标与图片，必须存放在对应分包的 `assets/` 目录下，严禁全部扔进主包 `src/assets/`。

### 1.2 依赖引入禁忌
- **NutUI 按需引入**：
  - 严禁全量 import 组件库。仅从对应子路径导入：
  ```tsx
  // ✅ 正确：按需导入
  import { Button, Dialog, Toast } from '@nutui/nutui-react-taro';
  import { Heart, Clock, Alert } from '@nutui/icons-react-taro';
  ```

---

## 2. 老人模式与家属模式动态切换 (Dual-Mode Architecture)

### 2.1 模式差异对比
| 维度 | 老人模式 (Elderly Mode) | 家属看护模式 (Family Mode) |
| :--- | :--- | :--- |
| **交互原则** | 极简、单屏 ≤ 3 核心操作、语音优先 | 监控、信息密集、时间轴、趋势图表 |
| **基准字号** | 20px 正文，48px 大数字，底线 16px | 14px ~ 16px 标准移动端字号 |
| **主屏布局** | 大卡片、SOS 醒目红色按钮、语音麦克风 | 今日动态、长者体征卡片、定位地图 |
| **硬件操作** | “一键开始测量”零门槛操作 | 设备管理、电量预警、围栏划定 |

### 2.2 状态驱动与 Hook 规范
使用 `useRole()` Hook 驱动全应用视图差异化渲染：
```tsx
import { useRole } from '@/hooks/useRole';

export const ActionZone = () => {
  const { isElderly } = useRole();

  if (isElderly) {
    return (
      <View className="flex flex-col gap-6 p-4">
        <BigElderlyButton 
          icon="sos" 
          title="紧急呼叫" 
          subtitle="长按3秒通知所有家人" 
          variant="danger" 
        />
        <BigElderlyButton 
          icon="pill" 
          title="今天服药" 
          subtitle="上午还有 1 次待吃" 
          variant="primary" 
        />
      </View>
    );
  }

  return <FamilyDashboardSummary />;
};
```

---

## 3. 适老化与 NutUI 主题定制规范

### 3.1 物理热区与大按钮规范
- **高度标准**：
  - 主行动按钮（Primary Action Button）：高度 **56px ~ 64px**，圆角 `16px`。
  - 次级辅助按钮：高度不低于 **48px**。
- **内边距与外间距**：
  - 卡片内边距统一为 `p-5`（20px），卡片间距 `gap-4`（16px），避免手指误按邻近按钮。

### 3.2 NutUI CSS 变量覆盖
在 `src/styles/tokens.scss` 中覆盖 NutUI 默认变量，契合银伴适老视觉：
```scss
:root {
  --nutui-brand-color: #165DFF;
  --nutui-brand-color-end: #0E42D2;
  --nutui-font-size-base: 18px;
  --nutui-font-size-lg: 22px;
  --nutui-font-size-xl: 28px;
  --nutui-button-default-height: 54px;
  --nutui-button-large-height: 64px;
}
```

---

## 4. 语音优先交互与科大讯飞适配 (Voice First)

长者往往不习惯虚拟软键盘输入，语音是其核心入口。
- **交互规范**：
  - 核心页面底部常驻醒目的浮动语音助手按钮（麦克风图标，尺寸 **60px × 60px**）。
  - 支持“长按说话”与“点击开始/点击结束”两种容错模式（部分手部震颤长者无法持续长按）。
- **动效与反馈**：
  - 录音中：展示平缓扩散的声波波形（Voice Waveform），辅以“正在聆听...”文字。
  - 识别中：展示“正在理解您的话...”。
- **失败优雅兜底**：
  - 若环境噪音大或识别失败，播报“没听清，请离近一点再说一次”，并提供常用快捷词卡片（“测血压”、“叫救护车”、“给儿子打电话”）。

---

## 5. 低功耗蓝牙（BLE）健康设备直连规范

银伴涉及蓝牙血压计、血糖仪、手环等硬件设备连接：
1. **自动重连与超时控制**：
   - 扫描超时设置为 10 秒；若未发现设备，给出“请确认设备电源已打开且在手机附近”引导，提供一键重试。
2. **状态机流转**：
   - `DISCONNECTED` → `SCANNING` → `CONNECTING` → `DISCOVERING_SERVICES` → `READY_TO_MEASURE`。
3. **断连即时恢复**：
   - 监听 `Taro.onBLEConnectionStateChange`，非预期断连时自动发起最多 3 次静默重连；重连失败后在界面给出黄色横幅提示，绝不弹出阻塞全屏的报错弹窗。

---

## 6. 小程序自查清单 (Mini Program Checklist)

- [ ] 主包与各分包编译后产物是否均在 2MB 安全红线以内？
- [ ] 老人模式下所有可点击元素是否均 ≥ 48px × 48px？
- [ ] 最小字号是否绝对坚守 ≥ 16px，正文是否保持在 18px ~ 20px？
- [ ] 蓝牙与录音权限拒绝时，是否有清晰的引导长者开启设置页的弹窗？
- [ ] 在弱网或断网时，是否有缓存的健康档案可供查看？
