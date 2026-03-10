export const designTokens = {
  brand: {
    canvas: '#f6f1e7',
    canvasSoft: '#fbf8f2',
    surface: '#fffdf9',
    surfaceAlt: '#f3ede3',
    ink: '#22303a',
    inkSoft: '#596570',
    inkMuted: '#8d98a3',
    line: '#ded6c7',
    primary: '#2f6c5b',
    primarySoft: '#ddefe9',
    primaryStrong: '#204d41',
    secondary: '#c97b55',
    secondarySoft: '#f6e1d7',
    danger: '#d75a4a',
    dangerSoft: '#fde7e1',
    warning: '#d99a3e',
    warningSoft: '#fff1d7',
    success: '#4b8d63',
    successSoft: '#e2f1e7',
    info: '#3d7ca6',
    infoSoft: '#e1eef8',
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 26,
    pill: 999,
  },
  shadow: {
    card: '0 12px 30px rgba(51, 65, 78, 0.08)',
    float: '0 18px 40px rgba(39, 52, 63, 0.14)',
  },
  motion: {
    fast: 160,
    base: 220,
    slow: 320,
  },
} as const

export const roleThemes = {
  elder: {
    accent: designTokens.brand.primary,
    accentSoft: designTokens.brand.primarySoft,
    accentStrong: designTokens.brand.primaryStrong,
    pageTitle: '长辈照护',
  },
  family: {
    accent: designTokens.brand.secondary,
    accentSoft: designTokens.brand.secondarySoft,
    accentStrong: '#8f5134',
    pageTitle: '家庭守护',
  },
} as const

export type RoleThemeKey = keyof typeof roleThemes
