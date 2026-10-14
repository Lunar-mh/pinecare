export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/services/index',
    'pages/dashboard/index',
    'pages/care/index',
    'pages/family-space/index',
    'pages/family-manage/index',
    'pages/profile/index',
    'pages/login/index',
    'pages/role-select/index',
    'pages/reset-password/index'
  ],
  entryPagePath: 'pages/index/index',
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#f6f1e7',
    navigationBarTitleText: '银伴',
    navigationBarTextStyle: 'black',
    navigationStyle: 'custom' // We will handle our own nav bars for immersive feeling
  },
  tabBar: {
    custom: true, // Use custom tab bar for dual-mode
    color: '#8d98a3',
    selectedColor: '#2f6c5b',
    backgroundColor: '#fffdf9',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页'
      },
      {
        pagePath: 'pages/services/index',
        text: '老服务'
      },
      {
        pagePath: 'pages/dashboard/index',
        text: '家看板'
      },
      {
        pagePath: 'pages/care/index',
        text: '家照护'
      },
      {
        pagePath: 'pages/family-space/index',
        text: '空间'
      },
      {
        pagePath: 'pages/family-manage/index',
        text: '管理'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的'
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
    { root: 'subpackages/settings', pages: ['pages/index/index', 'pages/device/index', 'pages/emergency/index', 'pages/feedback/index', 'pages/about/index'] }
  ]
})
