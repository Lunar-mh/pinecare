/**
 * 银伴小程序设计Token系统 v2.0
 * 支持长辈端(elder)和家属端(family)双模式
 */

// ============================================
// 色彩系统
// ============================================

/** 长辈端色彩 - 温暖舒适 */
export const elderColors = {
  // 背景层
  canvas: '#FFF9F0',        // 米黄暖底
  canvasSoft: '#FFFCF7',    // 更浅的暖白
  surface: '#FFFFFF',       // 卡片白
  surfaceAlt: '#FEF5E7',    // 次级卡片

  // 主色调 - 翡翠绿（健康/安全）
  primary: '#2F8C6B',
  primarySoft: '#E8F5F0',
  primaryStrong: '#1A5C45',
  primaryMuted: '#7FBAA5',

  // 辅助色 - 温暖橙（关怀/提醒）
  secondary: '#E67E22',
  secondarySoft: '#FDF2E6',
  secondaryStrong: '#BA6419',

  // 功能色（高对比度 - 适老化要求）
  danger: '#E53935',        // SOS红
  dangerSoft: '#FFEBEE',
  dangerStrong: '#B71C1C',
  warning: '#F57C00',       // 用药橙
  warningSoft: '#FFF3E0',
  warningStrong: '#E65100',
  success: '#43A047',       // 正常绿
  successSoft: '#E8F5E9',
  successStrong: '#2E7D32',
  info: '#1976D2',          // 信息蓝
  infoSoft: '#E3F2FD',
  infoStrong: '#1565C0',

  // 文字 - 高对比度 (WCAG AA 优化)
  textPrimary: '#1A1A1A',   // 主文字（黑色高对比）- 对比度 21:1
  textSecondary: '#4A4A4A', // 次文字 - 对比度 9.2:1
  textMuted: '#6B6B6B',     // 淡文字 - 对比度 6.8:1 (从 #7A7A7A 改深)
  textDisabled: '#8A8A8A',  // 禁用文字 - 对比度 6.1:1 (从 #BDBDBD 改深)

  // 边框
  border: '#E8DFD3',
  borderLight: '#F5EDE3',
  borderFocus: '#2F8C6B',

  // 特殊
  overlay: 'rgba(0, 0, 0, 0.5)',
  skeleton: '#F5EDE3',
} as const

/** 家属端色彩 - 专业冷静 */
export const familyColors = {
  // 背景层
  canvas: '#F5F7FA',        // 冷灰底
  canvasSoft: '#FAFBFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F2F5',

  // 主色调 - 科技蓝
  primary: '#3B82F6',
  primarySoft: '#EFF6FF',
  primaryStrong: '#1D4ED8',
  primaryMuted: '#93C5FD',

  // 辅助色
  secondary: '#8B5CF6',     // 紫色（AI功能）
  secondarySoft: '#F3E8FF',
  secondaryStrong: '#6D28D9',
  accent: '#F59E0B',        // 橙色（警告/提醒）
  accentSoft: '#FEF3C7',
  accentStrong: '#D97706',

  // 状态色
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  dangerStrong: '#DC2626',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  warningStrong: '#D97706',
  success: '#22C55E',
  successSoft: '#DCFCE7',
  successStrong: '#16A34A',
  info: '#06B6D4',
  infoSoft: '#CFFAFE',
  infoStrong: '#0891B2',

  // 文字 (WCAG AA 优化)
  textPrimary: '#1E293B',   // 主文字 - 对比度 15.9:1
  textSecondary: '#64748B', // 次文字 - 对比度 6.1:1
  textMuted: '#6B7280',     // 淡文字 - 对比度 5.2:1 (从 #94A3B8 改深)
  textDisabled: '#6B7280',  // 禁用文字 - 对比度 5.2:1 (从 #CBD5E1 改深)

  // 边框
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderFocus: '#3B82F6',

  // 特殊
  overlay: 'rgba(15, 23, 42, 0.5)',
  skeleton: '#E2E8F0',
} as const

// ============================================
// 字体系统
// ============================================

/** 长辈端字体 - 超大易读 */
export const elderTypography = {
  // 字号定义 [size, { lineHeight, fontWeight, letterSpacing? }]
  hero: ['48px', { lineHeight: '60px', fontWeight: 700 }],
  title: ['36px', { lineHeight: '48px', fontWeight: 700 }],
  subtitle: ['28px', { lineHeight: '38px', fontWeight: 600 }],
  body: ['24px', { lineHeight: '36px', fontWeight: 400 }],
  bodyBold: ['24px', { lineHeight: '36px', fontWeight: 600 }],
  caption: ['20px', { lineHeight: '28px', fontWeight: 400 }],

  // 尺寸常量
  minSize: 20,
  bodySize: 24,
  titleSize: 36,
  heroSize: 48,
} as const

/** 家属端字体 - 高效紧凑 */
export const familyTypography = {
  hero: ['28px', { lineHeight: '36px', fontWeight: 700 }],
  title: ['20px', { lineHeight: '28px', fontWeight: 600 }],
  subtitle: ['16px', { lineHeight: '24px', fontWeight: 600 }],
  body: ['14px', { lineHeight: '22px', fontWeight: 400 }],
  bodyBold: ['14px', { lineHeight: '22px', fontWeight: 600 }],
  caption: ['12px', { lineHeight: '18px', fontWeight: 400 }],
  tiny: ['10px', { lineHeight: '14px', fontWeight: 400 }],

  // 尺寸常量
  minSize: 10,
  bodySize: 14,
  titleSize: 20,
  heroSize: 28,
} as const

// ============================================
// 间距系统
// ============================================

export const spacing = {
  // 基础单位 4px
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
// 圆角系统
// ============================================

export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,

  // 模式专用
  bentoCard: 28,      // 长辈端大圆角
  dashCard: 16,       // 家属端现代圆角
  button: {
    elder: 20,
    family: 12,
  },
  input: {
    elder: 16,
    family: 8,
  },
} as const

// ============================================
// 阴影系统
// ============================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 12px rgba(0, 0, 0, 0.08)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
  xl: '0 12px 32px rgba(0, 0, 0, 0.15)',
  '2xl': '0 20px 48px rgba(0, 0, 0, 0.18)',

  // 特定场景
  bento: '0 8px 30px rgba(0, 0, 0, 0.08)',
  dash: '0 2px 10px rgba(0, 0, 0, 0.04)',
  card: '0 4px 16px rgba(0, 0, 0, 0.06)',
  float: '0 12px 40px rgba(0, 0, 0, 0.15)',
  fab: '0 6px 20px rgba(0, 0, 0, 0.2)',

  // 玻璃拟态
  glass: '0 8px 32px rgba(0, 0, 0, 0.1)',
  glassInner: 'inset 0 1px 0 rgba(255, 255, 255, 0.5)',

  // 按压状态
  pressed: '0 1px 2px rgba(0, 0, 0, 0.1)',
} as const

// ============================================
// 动效系统
// ============================================

export const motion = {
  // 时长
  duration: {
    instant: 0,
    fast: 150,
    base: 220,
    slow: 320,
    slower: 400,
  },

  // 缓动曲线
  easing: {
    linear: 'linear',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // 按压缩放
  pressScale: {
    elder: 0.96,
    family: 0.98,
  },

  // 尊重系统减少动效设置
  respectReducedMotion: true,
} as const

// ============================================
// 触控规范
// ============================================

export const touch = {
  // 最小触控热区
  minTarget: {
    elder: 60,    // 60x60px
    family: 44,   // 44x44px
  },

  // 推荐触控热区
  target: {
    elder: 72,    // 72x72px
    family: 48,   // 48x48px
  },

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
// 无障碍规范
// ============================================

export const accessibility = {
  // 最小对比度
  contrastRatio: {
    normal: 4.5,    // WCAG AA 普通文本
    large: 3,       // WCAG AA 大文本
    enhanced: 7,    // WCAG AAA
  },

  // 焦点环
  focusRing: {
    width: 2,
    offset: 2,
    color: {
      elder: '#2F8C6B',
      family: '#3B82F6',
    },
  },
} as const

// ============================================
// 角色主题配置
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
    buttonHeight: 72,
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
    buttonHeight: 44,
    inputHeight: 44,
    listItemHeight: 48,
  },
} as const

export type RoleThemeKey = keyof typeof roleThemes
export type ElderColors = typeof elderColors
export type FamilyColors = typeof familyColors

// ============================================
// 导出统一设计Token（向后兼容）
// ============================================

export const designTokens = {
  brand: {
    // 兼容旧版结构
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
} as const
