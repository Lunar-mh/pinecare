export default defineAppConfig({
  pages: [
    'pages/login/index',
    'pages/index/index',
    'pages/services/index',
    'pages/profile/index'
  ],
  entryPagePath: 'pages/login/index',
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#f6f1e7',
    navigationBarTitleText: '银伴',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#8d98a3',
    selectedColor: '#2f6c5b',
    backgroundColor: '#fffdf9',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'assets/tabbar/home.png',
        selectedIconPath: 'assets/tabbar/home-active.png'
      },
      {
        pagePath: 'pages/services/index',
        text: '守护服务',
        iconPath: 'assets/tabbar/services.png',
        selectedIconPath: 'assets/tabbar/services-active.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tabbar/profile.png',
        selectedIconPath: 'assets/tabbar/profile-active.png'
      }
    ]
  },
  subPackages: [
    {
      root: 'subpackages/health',
      pages: [
        'pages/index/index',
        'pages/blood-pressure/index',
        'pages/heart-rate/index',
        'pages/trend/index',
        'pages/records/index'
      ]
    },
    { root: 'subpackages/medication', pages: ['pages/index/index', 'pages/add/index'] },
    { root: 'subpackages/sos', pages: ['pages/index/index'] },
    { root: 'subpackages/voice_ai', pages: ['pages/index/index'] },
    { root: 'subpackages/timebank', pages: ['pages/index/index'] },
    { root: 'subpackages/family_space', pages: ['pages/index/index'] },
    { root: 'subpackages/location', pages: ['pages/index/index'] },
    { root: 'subpackages/medical', pages: ['pages/index/index'] },
    { root: 'subpackages/ai_consult', pages: ['pages/index/index'] },
    { root: 'subpackages/drug_check', pages: ['pages/index/index'] },
    { root: 'subpackages/ai_companion', pages: ['pages/index/index'] },
    { root: 'subpackages/settings', pages: ['pages/index/index', 'pages/device/index', 'pages/emergency/index', 'pages/feedback/index', 'pages/about/index'] },
    { root: 'subpackages/family_health', pages: ['pages/blood-pressure/index', 'pages/heart-rate/index'] }
  ]
})
