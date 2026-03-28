/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- 核心共用色 ---
        'yinban-primary': '#10B981',    // 翡翠绿 - 医疗/健康/主调
        'yinban-secondary': '#3B82F6',  // 科技蓝 - 家属端科技感
        'yinban-bg': '#F8FAFC',         // 全局底色 (Dashboard 灰色)
        
        // --- 长辈端 (Bento Box) 高对比色 ---
        'bento-card': '#FFFFFF',
        'bento-danger': '#FF3B30',      // 极致高亮红 - 专用于一键 SOS
        'bento-warning': '#FF9500',     // 橙色 - 提醒服药
        'bento-success': '#34C759',     // 绿色 - 正常状态
        'bento-text-main': '#000000',   // 极高对比黑
        'bento-text-sub': '#666666',
        
        // --- 家属端 (Dashboard) 数据色 ---
        'dash-card': '#FFFFFF',
        'dash-text-main': '#1E293B',
        'dash-text-sub': '#64748B',
        'dash-border': '#E2E8F0',
      },
      borderRadius: {
        'bento': '32px',       // 长辈端超大圆角
        'dash': '16px',        // 家属端现代圆角
      },
      boxShadow: {
        'bento': '0 8px 30px rgba(0, 0, 0, 0.08)',
        'dash': '0 2px 10px rgba(0, 0, 0, 0.04)',
      },
      fontSize: {
        // 长辈端专属字号 (超大)
        'elder-body': ['24px', '32px'],
        'elder-title': ['36px', '44px'],
        'elder-hero': ['48px', '56px'],
        // 家属端专属字号 (标准适中)
        'dash-tiny': ['12px', '16px'],
        'dash-body': ['14px', '20px'],
        'dash-title': ['18px', '24px'],
        'dash-hero': ['28px', '36px'],
      },
      gridTemplateColumns: {
        'bento': 'repeat(2, minmax(0, 1fr))',
      },
      gridAutoRows: {
        'bento': 'minmax(120px, auto)',
      }
    },
  },
  plugins: [],
}
