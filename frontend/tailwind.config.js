/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'yao-blue': '#2D5AEE',      // 曜蓝 - 核心色
        'yao-gold': '#F09236',      // 暖阳金 - 预警/温馨
        'yao-bg': '#F8FAFF',        // 背景色
        'yao-text': '#1A1A1A',      // 正文黑
        'yao-card-bg': '#FFFFFF',   // 卡片背景
        'yao-danger': '#FF4D4F',    // 紧急红色
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      },
      spacing: {
        '18': '72px',
      },
      fontSize: {
        'elder-base': '20px',
        'elder-title': '32px',
        'elder-huge': '48px',
      }
    },
  },
  plugins: [],
}
