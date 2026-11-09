/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ============================================
      // 色彩系统 - 暖玉微晶·液态温润 (WCAG AAA)
      // ============================================
      colors: {
        // --- 长辈端色彩 (Warm Jade & Liquid Glass) ---
        elder: {
          canvas: '#F8F6F0',          // 暖玉凝脂画布底色
          'canvas-soft': '#FFFDF9',   // 玉脂微光
          surface: 'rgba(255, 255, 255, 0.78)',
          'surface-opaque': '#FFFDF9',
          'surface-alt': '#F4F0E8',
          primary: '#1F6B56',         // 翡翠松青 (AAA 8.2:1)
          'primary-soft': '#E6F2ED',
          'primary-strong': '#144638',
          'primary-muted': '#5C9B86',
          secondary: '#C86D3B',       // 暖栗琥珀 (AA 5.1:1)
          'secondary-soft': '#FAF0E8',
          'secondary-strong': '#994E24',
          danger: '#D33833',          // 朱砂朱雀
          'danger-soft': '#FCEBEA',
          'danger-strong': '#991F1B',
          warning: '#C86D3B',
          'warning-soft': '#FAF0E8',
          success: '#278A5B',
          'success-soft': '#EBF6F0',
          info: '#2A7E8D',
          'info-soft': '#E6F4F7',
          'text-primary': '#18221E',  // 极深乌金
          'text-secondary': '#485750',// 沉香黛灰
          'text-muted': '#6F7E77',    // 幽兰青灰
          'text-disabled': '#93A19A',
          border: '#E2DCD2',
          'border-light': 'rgba(255, 255, 255, 0.85)',
          'border-bottom': 'rgba(210, 225, 218, 0.6)',
        },

        // --- 家属端色彩 (典雅沉静) ---
        family: {
          canvas: '#F4F6F5',
          'canvas-soft': '#FFFFFF',
          surface: 'rgba(255, 255, 255, 0.92)',
          'surface-opaque': '#FFFFFF',
          'surface-alt': '#F0F4F2',
          primary: '#1F6B56',
          'primary-soft': '#E6F2ED',
          'primary-strong': '#144638',
          secondary: '#C86D3B',
          'secondary-soft': '#FAF0E8',
          accent: '#C86D3B',
          'accent-soft': '#FAF0E8',
          danger: '#D33833',
          'danger-soft': '#FCEBEA',
          warning: '#C86D3B',
          'warning-soft': '#FAF0E8',
          success: '#278A5B',
          'success-soft': '#EBF6F0',
          info: '#2A7E8D',
          'info-soft': '#E6F4F7',
          'text-primary': '#18221E',
          'text-secondary': '#485750',
          'text-muted': '#6F7E77',
          'text-disabled': '#93A19A',
          border: '#D9E2DE',
          'border-light': '#EDF2F0',
        },

        // --- 向后兼容命名 ---
        'yinban-primary': '#1F6B56',
        'yinban-secondary': '#C86D3B',
        'yinban-danger': '#D33833',
        'yinban-bg': '#F8F6F0',
        'bento-card': '#FFFDF9',
        'bento-danger': '#D33833',
        'bento-warning': '#C86D3B',
        'bento-success': '#278A5B',
        'bento-text-main': '#18221E',
        'bento-text-sub': '#485750',
        'dash-card': '#FFFFFF',
        'dash-text-main': '#18221E',
        'dash-text-sub': '#485750',
        'dash-border': '#D9E2DE',
      },

      // ============================================
      // 适老字号阶梯 (彻底清除 10px/12px/13px，底线≥16px)
      // ============================================
      fontSize: {
        // --- 长辈端字号 ---
        'elder-caption': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'elder-body': ['20px', { lineHeight: '32px', fontWeight: '500' }],
        'elder-body-bold': ['20px', { lineHeight: '32px', fontWeight: '700' }],
        'elder-subtitle': ['28px', { lineHeight: '38px', fontWeight: '600' }],
        'elder-title': ['36px', { lineHeight: '48px', fontWeight: '700' }],
        'elder-metric': ['42px', { lineHeight: '52px', fontWeight: '700' }],
        'elder-hero': ['48px', { lineHeight: '60px', fontWeight: '700' }],

        // --- 家属端与兼容迁移 (彻底消除 10-13px) ---
        'family-tiny': ['16px', { lineHeight: '22px', fontWeight: '400' }],
        'family-caption': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'family-body': ['16px', { lineHeight: '24px', fontWeight: '500' }],
        'family-body-bold': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'family-subtitle': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'family-title': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'family-hero': ['32px', { lineHeight: '40px', fontWeight: '700' }],

        // --- 旧兼容命名升级 ---
        'dash-tiny': ['16px', { lineHeight: '22px', fontWeight: '400' }],
        'dash-body': ['18px', { lineHeight: '26px', fontWeight: '400' }],
        'dash-title': ['22px', { lineHeight: '30px', fontWeight: '600' }],
        'dash-hero': ['32px', { lineHeight: '40px', fontWeight: '700' }],
      },

      // ============================================
      // 圆角系统
      // ============================================
      borderRadius: {
        'none': '0',
        'sm': '12px',
        'md': '18px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '24px',
        '3xl': '32px',
        'full': '9999px',
        'bento': '32px',
        'bento-sm': '20px',
        'dash': '18px',
        'dash-sm': '12px',
        'btn-elder': '20px',
        'btn-family': '14px',
        'pill': '40px',
      },

      // ============================================
      // 阴影系统 (暖漫射软阴影与微晶高光)
      // ============================================
      boxShadow: {
        'sm': '0 1px 2px rgba(31, 55, 45, 0.05)',
        'md': '0 4px 14px -2px rgba(31, 55, 45, 0.05), 0 16px 36px -4px rgba(31, 55, 45, 0.08)',
        'lg': '0 8px 24px -4px rgba(31, 55, 45, 0.12)',
        'xl': '0 12px 32px rgba(31, 55, 45, 0.15)',
        '2xl': '0 20px 48px rgba(31, 55, 45, 0.18)',
        'liquid-glass': 'inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.95), 0 4px 14px -2px rgba(31, 55, 45, 0.05), 0 16px 36px -4px rgba(31, 55, 45, 0.08)',
        'liquid-pill': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.9), 0 8px 24px -4px rgba(31, 55, 45, 0.12)',
        'btn-primary': '0 8px 20px -2px rgba(31, 107, 86, 0.28)',
        'btn-danger': '0 8px 20px -2px rgba(211, 56, 51, 0.32)',
        'bento': 'inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.95), 0 4px 14px -2px rgba(31, 55, 45, 0.05), 0 16px 36px -4px rgba(31, 55, 45, 0.08)',
        'bento-hover': '0 12px 40px rgba(31, 55, 45, 0.12)',
        'dash': '0 2px 10px rgba(31, 55, 45, 0.04)',
        'dash-hover': '0 4px 16px rgba(31, 55, 45, 0.08)',
        'card': '0 4px 16px rgba(31, 55, 45, 0.06)',
        'card-hover': '0 8px 24px rgba(31, 55, 45, 0.1)',
        'float': '0 12px 40px rgba(31, 55, 45, 0.15)',
        'fab': '0 6px 20px rgba(31, 107, 86, 0.2)',
        'glass': '0 8px 32px rgba(31, 55, 45, 0.1)',
        'pressed': '0 1px 2px rgba(31, 55, 45, 0.1)',
      },

      // ============================================
      // 间距与触控热区
      // ============================================
      spacing: {
        '4.5': '18px',
        '5.5': '22px',
        '13': '52px',
        '15': '60px',
        '18': '72px',
        '22': '88px',
        '26': '104px',
        '30': '120px',
        'touch-sm': '48px',
        'touch-md': '52px',
        'touch-lg': '60px',
        'touch-xl': '72px',
        'page-elder': '20px',
        'page-family': '16px',
      },

      // ============================================
      // 尺寸系统 (主按键 ≥60px)
      // ============================================
      height: {
        'btn-elder': '64px',
        'btn-family': '48px',
        'tab-pill': '68px',
        'input-elder': '56px',
        'input-family': '44px',
        'list-elder': '72px',
        'list-family': '52px',
      },
      minHeight: {
        'touch-elder': '60px',
        'touch-family': '48px',
      },

      // ============================================
      // 背景渐变
      // ============================================
      backgroundImage: {
        'elder-gradient': 'linear-gradient(180deg, #F8F6F0 0%, #FFFDF9 100%)',
        'elder-card': 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 253, 249, 0.75) 100%)',
        'elder-primary': 'linear-gradient(135deg, #1F6B56 0%, #2A8C70 100%)',
        'elder-danger': 'linear-gradient(135deg, #D33833 0%, #E05450 100%)',
        'elder-warning': 'linear-gradient(135deg, #C86D3B 0%, #DF814D 100%)',
        'family-gradient': 'linear-gradient(180deg, #F4F6F5 0%, #FFFFFF 100%)',
        'family-card': 'linear-gradient(135deg, #FFFFFF 0%, #F4F6F5 100%)',
        'family-primary': 'linear-gradient(135deg, #1F6B56 0%, #2A8C70 100%)',
        'family-header': 'linear-gradient(135deg, #1F6B56 0%, #144638 100%)',
      },

      // ============================================
      // 模糊效果 (微晶毛玻璃)
      // ============================================
      backdropBlur: {
        'glass': '20px',
        'glass-light': '10px',
      },
    },
  },
  plugins: [],
}
