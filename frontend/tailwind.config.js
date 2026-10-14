/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ============================================
      // 色彩系统
      // ============================================
      colors: {
        // --- 长辈端色彩 (Bento Box 温暖风) ---
        elder: {
          canvas: '#FFF9F0',
          'canvas-soft': '#FFFCF7',
          surface: '#FFFFFF',
          'surface-alt': '#FEF5E7',
          primary: '#2F8C6B',
          'primary-soft': '#E8F5F0',
          'primary-strong': '#1A5C45',
          secondary: '#E67E22',
          'secondary-soft': '#FDF2E6',
          danger: '#E53935',
          'danger-soft': '#FFEBEE',
          warning: '#F57C00',
          'warning-soft': '#FFF3E0',
          success: '#43A047',
          'success-soft': '#E8F5E9',
          info: '#1976D2',
          'info-soft': '#E3F2FD',
          'text-primary': '#1A1A1A',
          'text-secondary': '#4A4A4A',
          'text-muted': '#7A7A7A',
          border: '#E8DFD3',
          'border-light': '#F5EDE3',
        },

        // --- 家属端色彩 (Dashboard 专业风) ---
        family: {
          canvas: '#F5F7FA',
          'canvas-soft': '#FAFBFC',
          surface: '#FFFFFF',
          'surface-alt': '#F0F2F5',
          primary: '#3B82F6',
          'primary-soft': '#EFF6FF',
          'primary-strong': '#1D4ED8',
          secondary: '#8B5CF6',
          'secondary-soft': '#F3E8FF',
          accent: '#F59E0B',
          'accent-soft': '#FEF3C7',
          danger: '#EF4444',
          'danger-soft': '#FEE2E2',
          warning: '#F59E0B',
          'warning-soft': '#FEF3C7',
          success: '#22C55E',
          'success-soft': '#DCFCE7',
          info: '#06B6D4',
          'info-soft': '#CFFAFE',
          'text-primary': '#1E293B',
          'text-secondary': '#64748B',
          'text-muted': '#94A3B8',
          border: '#E2E8F0',
          'border-light': '#F1F5F9',
        },

        // --- 向后兼容旧命名 ---
        'yinban-primary': '#2F8C6B',
        'yinban-secondary': '#3B82F6',
        'yinban-bg': '#F8FAFC',
        'bento-card': '#FFFFFF',
        'bento-danger': '#E53935',
        'bento-warning': '#F57C00',
        'bento-success': '#43A047',
        'bento-text-main': '#1A1A1A',
        'bento-text-sub': '#4A4A4A',
        'dash-card': '#FFFFFF',
        'dash-text-main': '#1E293B',
        'dash-text-sub': '#64748B',
        'dash-border': '#E2E8F0',
      },

      // ============================================
      // 字体系统
      // ============================================
      fontSize: {
        // --- 长辈端字号 (超大易读) ---
        'elder-caption': ['20px', { lineHeight: '28px', fontWeight: '400' }],
        'elder-body': ['24px', { lineHeight: '36px', fontWeight: '400' }],
        'elder-body-bold': ['24px', { lineHeight: '36px', fontWeight: '600' }],
        'elder-subtitle': ['28px', { lineHeight: '38px', fontWeight: '600' }],
        'elder-title': ['36px', { lineHeight: '48px', fontWeight: '700' }],
        'elder-hero': ['48px', { lineHeight: '60px', fontWeight: '700' }],

        // --- 家属端字号 (高效紧凑) ---
        'family-tiny': ['10px', { lineHeight: '14px', fontWeight: '400' }],
        'family-caption': ['12px', { lineHeight: '18px', fontWeight: '400' }],
        'family-body': ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'family-body-bold': ['14px', { lineHeight: '22px', fontWeight: '600' }],
        'family-subtitle': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'family-title': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'family-hero': ['28px', { lineHeight: '36px', fontWeight: '700' }],

        // --- 向后兼容旧命名 ---
        'dash-tiny': ['12px', '16px'],
        'dash-body': ['14px', '20px'],
        'dash-title': ['18px', '24px'],
        'dash-hero': ['28px', '36px'],
      },

      // ============================================
      // 圆角系统
      // ============================================
      borderRadius: {
        'none': '0',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
        'full': '9999px',
        // 模式专用
        'bento': '28px',
        'bento-sm': '20px',
        'dash': '16px',
        'dash-sm': '12px',
        // 按钮
        'btn-elder': '20px',
        'btn-family': '12px',
      },

      // ============================================
      // 阴影系统
      // ============================================
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'xl': '0 12px 32px rgba(0, 0, 0, 0.15)',
        '2xl': '0 20px 48px rgba(0, 0, 0, 0.18)',
        // Bento 专用
        'bento': '0 8px 30px rgba(0, 0, 0, 0.08)',
        'bento-hover': '0 12px 40px rgba(0, 0, 0, 0.12)',
        // Dashboard 专用
        'dash': '0 2px 10px rgba(0, 0, 0, 0.04)',
        'dash-hover': '0 4px 16px rgba(0, 0, 0, 0.08)',
        // 卡片
        'card': '0 4px 16px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.1)',
        // 浮动
        'float': '0 12px 40px rgba(0, 0, 0, 0.15)',
        'fab': '0 6px 20px rgba(0, 0, 0, 0.2)',
        // 玻璃拟态
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
        // 按压
        'pressed': '0 1px 2px rgba(0, 0, 0, 0.1)',
      },

      // ============================================
      // 间距系统
      // ============================================
      spacing: {
        // 常用间距
        '4.5': '18px',
        '5.5': '22px',
        '13': '52px',
        '15': '60px',
        '18': '72px',
        '22': '88px',
        '26': '104px',
        '30': '120px',
        // 触控热区
        'touch-sm': '44px',
        'touch-md': '48px',
        'touch-lg': '60px',
        'touch-xl': '72px',
        // 页面边距
        'page-elder': '20px',
        'page-family': '16px',
      },

      // ============================================
      // 网格系统
      // ============================================
      gridTemplateColumns: {
        'bento': 'repeat(2, minmax(0, 1fr))',
        'bento-3': 'repeat(3, minmax(0, 1fr))',
        'dash-2': 'repeat(2, minmax(0, 1fr))',
        'dash-3': 'repeat(3, minmax(0, 1fr))',
        'dash-4': 'repeat(4, minmax(0, 1fr))',
      },
      gridAutoRows: {
        'bento': 'minmax(120px, auto)',
        'bento-sm': 'minmax(100px, auto)',
        'dash': 'minmax(80px, auto)',
      },

      // ============================================
      // 尺寸系统
      // ============================================
      width: {
        'bento-icon': '56px',
        'dash-icon': '32px',
        'tab-icon-elder': '36px',
        'tab-icon-family': '28px',
      },
      height: {
        'btn-elder': '72px',
        'btn-family': '44px',
        'input-elder': '56px',
        'input-family': '44px',
        'list-elder': '72px',
        'list-family': '48px',
      },
      minHeight: {
        'touch-elder': '60px',
        'touch-family': '44px',
      },

      // ============================================
      // 动效系统
      // ============================================
      transitionDuration: {
        'fast': '150ms',
        'base': '220ms',
        'slow': '320ms',
        'slower': '400ms',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.0, 0, 0.2, 1)',
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },

      // ============================================
      // 动画
      // ============================================
      animation: {
        'press-elder': 'press-elder 150ms ease-out',
        'press-family': 'press-family 150ms ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'fade-in': 'fade-in 220ms ease-out',
        'slide-up': 'slide-up 320ms ease-out',
        'scale-in': 'scale-in 220ms ease-out',
      },
      keyframes: {
        'press-elder': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.96)' },
          '100%': { transform: 'scale(1)' },
        },
        'press-family': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.98)' },
          '100%': { transform: 'scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },

      // ============================================
      // 背景渐变
      // ============================================
      backgroundImage: {
        // 长辈端渐变
        'elder-gradient': 'linear-gradient(180deg, #FFF9F0 0%, #FFFFFF 100%)',
        'elder-card': 'linear-gradient(135deg, #FFFFFF 0%, #FEF5E7 100%)',
        'elder-primary': 'linear-gradient(135deg, #2F8C6B 0%, #3DA87E 100%)',
        'elder-danger': 'linear-gradient(135deg, #E53935 0%, #EF5350 100%)',
        'elder-warning': 'linear-gradient(135deg, #F57C00 0%, #FF9800 100%)',
        // 家属端渐变
        'family-gradient': 'linear-gradient(180deg, #F5F7FA 0%, #FFFFFF 100%)',
        'family-card': 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
        'family-primary': 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
        'family-header': 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      },

      // ============================================
      // 模糊效果 (玻璃拟态)
      // ============================================
      backdropBlur: {
        'glass': '20px',
        'glass-light': '10px',
      },
    },
  },
  plugins: [],
}
