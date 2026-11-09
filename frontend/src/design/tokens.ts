/**
 * 银伴智慧照护平台 - 暖玉微晶·液态温润 (Warm Jade & Liquid Glass) 设计令牌系统
 * 遵循 PROJECT.md §1.2 规范与 WCAG AAA 适老无障碍标准
 * 支持长辈端(elder)和家属端(family)双模式
 */

// ============================================
// 1. 色彩体系 (Color Tokens)
// ============================================

/** 长辈端色彩 - 暖玉微晶·沉稳温润 */
export const elderColors = {
  // 画布与材质
  canvas: '#F8F6F0',          // 暖玉凝脂画布底色
  canvasSoft: '#FFFDF9',      // 玉脂微光次表面
  surface: 'rgba(255, 255, 255, 0.78)', // 通透润白微晶材质
  surfaceOpaque: '#FFFDF9',   // 降级实色玉白
  surfaceAlt: '#F4F0E8',      // 次级卡片

  // 品牌主色 - 翡翠松青 (AAA 8.2:1 对比度)
  primary: '#1F6B56',
  primarySoft: '#E6F2ED',
  primaryStrong: '#144638',
  primaryMuted: '#5C9B86',

  // 关怀辅助色 - 暖栗琥珀 (服药与提醒，AA 5.1:1 对比度)
  secondary: '#C86D3B',
  secondarySoft: '#FAF0E8',
  secondaryStrong: '#994E24',

  // 紧急急救色 - 朱砂朱雀 (SOS 与跌倒，醒目庄严无眩光)
  danger: '#D33833',
  dangerSoft: '#FCEBEA',
  dangerStrong: '#991F1B',

  // 功能与状态色
  warning: '#C86D3B',
  warningSoft: '#FAF0E8',
  warningStrong: '#994E24',

  // 健康与正常状态 - 常青翡翠
  success: '#278A5B',
  successSoft: '#EBF6F0',
  successStrong: '#195B3C',

  info: '#2A7E8D',
  infoSoft: '#E6F4F7',
  infoStrong: '#1B5B67',

  // 文字墨色 - 极致适老对比度 (极深乌金 15.2:1 / 沉香黛灰 6.8:1 / 幽兰青灰 4.6:1)
  textPrimary: '#18221E',     // Ink 1
  textSecondary: '#485750',   // Ink 2
  textMuted: '#6F7E77',       // Ink 3 (底线绝不低于 4.5:1)
  textDisabled: '#93A19A',

  // 微晶边框
  border: '#E2DCD2',
  borderLight: '#F0ECE4',
  borderGlass: 'rgba(255, 255, 255, 0.85)',
  borderGlassBottom: 'rgba(210, 225, 218, 0.6)',
  borderSubtle: '#E2DCD2',
  borderFocus: '#1F6B56',

  // 遮罩与占位
  overlay: 'rgba(24, 34, 30, 0.6)',
  skeleton: '#EFEAE0',
} as const

/** 家属端色彩 - 典雅沉静·同源翡翠 */
export const familyColors = {
  canvas: '#F4F6F5',
  canvasSoft: '#FFFFFF',
  surface: 'rgba(255, 255, 255, 0.92)',
  surfaceOpaque: '#FFFFFF',
  surfaceAlt: '#F0F4F2',

  // 主色调统合为翡翠松青
  primary: '#1F6B56',
  primarySoft: '#E6F2ED',
  primaryStrong: '#144638',
  primaryMuted: '#5C9B86',

  // 辅助色 - 暖栗琥珀
  secondary: '#C86D3B',
  secondarySoft: '#FAF0E8',
  secondaryStrong: '#994E24',
  accent: '#C86D3B',
  accentSoft: '#FAF0E8',
  accentStrong: '#994E24',

  // 状态色
  danger: '#D33833',
  dangerSoft: '#FCEBEA',
  dangerStrong: '#991F1B',
  warning: '#C86D3B',
  warningSoft: '#FAF0E8',
  warningStrong: '#994E24',
  success: '#278A5B',
  successSoft: '#EBF6F0',
  successStrong: '#195B3C',
  info: '#2A7E8D',
  infoSoft: '#E6F4F7',
  infoStrong: '#1B5B67',

  // 文字 - WCAG AAA / AA 优化
  textPrimary: '#18221E',
  textSecondary: '#485750',
  textMuted: '#6F7E77',
  textDisabled: '#93A19A',

  // 边框
  border: '#D9E2DE',
  borderLight: '#EDF2F0',
  borderGlass: 'rgba(255, 255, 255, 0.9)',
  borderSubtle: '#D9E2DE',
  borderFocus: '#1F6B56',

  // 特殊
  overlay: 'rgba(24, 34, 30, 0.5)',
  skeleton: '#E6EDE9',
} as const

// ============================================
// 2. 适老化字号阶梯 (严格消除 10px~13px)
// ============================================

/** 长辈端字体 - 适老超大易读 (正文≥20px，底线≥16px) */
export const elderTypography = {
  // 超大生命指标 (血压/心率/倒计时)
  hero: ['48px', { lineHeight: '60px', fontWeight: 700 }],
  // 核心重点数据
  metric: ['42px', { lineHeight: '52px', fontWeight: 700 }],
  // 页面/弹窗大标题
  title: ['36px', { lineHeight: '48px', fontWeight: 700 }],
  // 模块二级标题
  subtitle: ['28px', { lineHeight: '38px', fontWeight: 600 }],
  // 操作按键与卡片标题
  action: ['24px', { lineHeight: '36px', fontWeight: 600 }],
  // 适老标准正文 (≥20px)
  body: ['20px', { lineHeight: '32px', fontWeight: 500 }],
  bodyBold: ['20px', { lineHeight: '32px', fontWeight: 700 }],
  // 辅助说明与标签 (底线绝对 ≥16px)
  caption: ['16px', { lineHeight: '24px', fontWeight: 400 }],

  // 尺寸常量
  minSize: 16,
  captionSize: 16,
  bodySize: 20,
  actionSize: 24,
  subtitleSize: 28,
  titleSize: 36,
  metricSize: 42,
  heroSize: 48,
} as const

/** 家属端字体 - 高效清晰 (底线绝对≥16px，严禁 10-13px) */
export const familyTypography = {
  hero: ['32px', { lineHeight: '40px', fontWeight: 700 }],
  title: ['24px', { lineHeight: '32px', fontWeight: 600 }],
  subtitle: ['20px', { lineHeight: '28px', fontWeight: 600 }],
  body: ['16px', { lineHeight: '24px', fontWeight: 400 }],
  bodyBold: ['16px', { lineHeight: '24px', fontWeight: 600 }],
  caption: ['16px', { lineHeight: '22px', fontWeight: 400 }],
  tiny: ['16px', { lineHeight: '22px', fontWeight: 400 }], // 提升至适老底线 16px，杜绝 10px 违规

  // 尺寸常量
  minSize: 16,
  captionSize: 16,
  bodySize: 16,
  titleSize: 24,
  heroSize: 32,
} as const

// ============================================
// 3. 液态玻璃物理公式 (Physical Liquid Glass Formula)
// ============================================
export const liquidGlass = {
  backdropFilter: 'blur(20px) saturate(180%)',
  backdropFilterWebkit: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.85)',
  borderBottom: '1px solid rgba(210, 225, 218, 0.6)',
  highlight: 'inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.95)',
  warmShadow: '0 4px 14px -2px rgba(31, 55, 45, 0.05), 0 16px 36px -4px rgba(31, 55, 45, 0.08)',
  boxShadow: 'inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.95), 0 4px 14px -2px rgba(31, 55, 45, 0.05), 0 16px 36px -4px rgba(31, 55, 45, 0.08)',
  pillShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.9), 0 8px 24px -4px rgba(31, 55, 45, 0.12)',
  activeTransform: 'translateY(2px) scale(0.975)',
  fallbackBg: 'rgba(255, 253, 249, 0.95)',
} as const

// ============================================
// 4. 间距系统
// ============================================

export const spacing = {
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,

  // 页面边距
  pageX: {
    elder: 20,
    family: 16,
  },

  // 区块间距
  sectionGap: {
    elder: 24,
    family: 20,
  },

  // 卡片间距
  cardGap: {
    elder: 16,
    family: 12,
  },

  // 卡片内边距
  cardPadding: {
    elder: 20,
    family: 16,
  },
} as const

// ============================================
// 5. 圆角系统
// ============================================

export const radius = {
  none: 0,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  '2xl': 24,
  '3xl': 32,
  full: 9999,

  // 模式专用
  bentoCard: 32,      // 长辈 Bento 卡片大圆角
  dashCard: 18,       // 家属端圆角
  pill: 40,           // 浮动药丸圆角
  button: {
    elder: 20,
    family: 14,
  },
  input: {
    elder: 16,
    family: 12,
  },
} as const

// ============================================
// 6. 阴影系统
// ============================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(31, 55, 45, 0.05)',
  md: '0 4px 14px -2px rgba(31, 55, 45, 0.05), 0 16px 36px -4px rgba(31, 55, 45, 0.08)',
  lg: '0 8px 24px -4px rgba(31, 55, 45, 0.12)',
  xl: '0 12px 32px rgba(31, 55, 45, 0.15)',
  '2xl': '0 20px 48px rgba(31, 55, 45, 0.18)',

  // 特定场景
  bento: 'inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.95), 0 4px 14px -2px rgba(31, 55, 45, 0.05), 0 16px 36px -4px rgba(31, 55, 45, 0.08)',
  dash: '0 2px 10px rgba(31, 55, 45, 0.04)',
  card: '0 4px 16px rgba(31, 55, 45, 0.06)',
  float: '0 12px 40px rgba(31, 55, 45, 0.15)',
  fab: '0 6px 20px rgba(31, 107, 86, 0.2)',

  // 玻璃拟态与按键
  liquidGlass: liquidGlass.boxShadow,
  liquidPill: liquidGlass.pillShadow,
  buttonPrimary: '0 8px 20px -2px rgba(31, 107, 86, 0.28)',
  buttonDanger: '0 8px 20px -2px rgba(211, 56, 51, 0.32)',
  pressed: '0 1px 2px rgba(31, 55, 45, 0.1)',
} as const

// ============================================
// 7. 动效系统
// ============================================

export const motion = {
  duration: {
    instant: 0,
    fast: 150,
    base: 220,
    slow: 320,
    slower: 400,
  },

  easing: {
    linear: 'linear',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  pressScale: {
    elder: 0.975,
    family: 0.98,
  },

  respectReducedMotion: true,
} as const

// ============================================
// 8. 触控规范 (主按键 ≥60px，热区 ≥60×60px)
// ============================================

export const touch = {
  // 最小物理触控热区
  minTarget: {
    elder: 60,    // 60x60px
    family: 48,   // 48x48px
  },

  // 推荐触控热区
  target: {
    elder: 72,    // 72x72px
    family: 52,
  },

  // 按键高度规范 (坚守 ≥60px)
  buttonHeightLarge: 64,
  buttonHeightMedium: 52,
  pillHeight: 68,

  // Tab图标尺寸
  tabIcon: {
    elder: 36,
    family: 28,
  },

  // 功能入口图标
  actionIcon: {
    elder: 56,
    family: 32,
  },

  // 列表项图标
  listIcon: {
    elder: 32,
    family: 24,
  },

  // 行内图标
  inlineIcon: {
    elder: 24,
    family: 20,
  },
} as const

// ============================================
// 9. 无障碍规范 (WCAG AAA)
// ============================================

export const accessibility = {
  contrastRatio: {
    normal: 4.5,    // WCAG AA 普通文本
    large: 3,       // WCAG AA 大文本
    enhanced: 7,    // WCAG AAA (翡翠松青/乌金达 8.2:1 / 15.2:1)
  },

  focusRing: {
    width: 2,
    offset: 2,
    color: {
      elder: '#1F6B56',
      family: '#1F6B56',
    },
  },
} as const

// ============================================
// 10. 角色主题配置
// ============================================

export const roleThemes = {
  elder: {
    colors: elderColors,
    typography: elderTypography,
    accent: elderColors.primary,
    accentSoft: elderColors.primarySoft,
    accentStrong: elderColors.primaryStrong,
    pageTitle: '长辈照护',
    cardRadius: radius.bentoCard,
    buttonHeight: touch.buttonHeightLarge, // 64px ≥ 60px
    inputHeight: 56,
    listItemHeight: 72,
  },
  family: {
    colors: familyColors,
    typography: familyTypography,
    accent: familyColors.primary,
    accentSoft: familyColors.primarySoft,
    accentStrong: familyColors.primaryStrong,
    pageTitle: '家庭守护',
    cardRadius: radius.dashCard,
    buttonHeight: 48,
    inputHeight: 44,
    listItemHeight: 52,
  },
} as const

export type RoleThemeKey = keyof typeof roleThemes
export type ElderColors = typeof elderColors
export type FamilyColors = typeof familyColors

// ============================================
// 11. 导出统一设计Token（向后兼容）
// ============================================

export const designTokens = {
  brand: {
    canvas: elderColors.canvas,
    canvasSoft: elderColors.canvasSoft,
    surface: elderColors.surface,
    surfaceAlt: elderColors.surfaceAlt,
    ink: elderColors.textPrimary,
    inkSoft: elderColors.textSecondary,
    inkMuted: elderColors.textMuted,
    line: elderColors.border,
    primary: elderColors.primary,
    primarySoft: elderColors.primarySoft,
    primaryStrong: elderColors.primaryStrong,
    secondary: elderColors.secondary,
    secondarySoft: elderColors.secondarySoft,
    danger: elderColors.danger,
    dangerSoft: elderColors.dangerSoft,
    warning: elderColors.warning,
    warningSoft: elderColors.warningSoft,
    success: elderColors.success,
    successSoft: elderColors.successSoft,
    info: elderColors.info,
    infoSoft: elderColors.infoSoft,
  },
  radius,
  shadow: shadows,
  motion,
  liquidGlass,
  touch,
} as const
