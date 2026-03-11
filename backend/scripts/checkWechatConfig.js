const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// 检查微信配置
console.log('=== 微信配置检查 ===');
console.log('WX_ACCESS_TOKEN:', process.env.WX_ACCESS_TOKEN ? '已设置 (' + process.env.WX_ACCESS_TOKEN.substring(0, 20) + '...)' : '未设置');
console.log('WX_MSG_TEMPLATE_ID:', process.env.WX_MSG_TEMPLATE_ID ? '已设置 (' + process.env.WX_MSG_TEMPLATE_ID.substring(0, 20) + '...)' : '未设置');
console.log('WX_MSG_TEMPLATE_ID_FAMILY:', process.env.WX_MSG_TEMPLATE_ID_FAMILY ? '已设置' : '未设置');
console.log('WX_MSG_TEMPLATE_ID_REFILL:', process.env.WX_MSG_TEMPLATE_ID_REFILL ? '已设置' : '未设置');
console.log('WX_MSG_TEMPLATE_ID_SECOND:', process.env.WX_MSG_TEMPLATE_ID_SECOND ? '已设置' : '未设置');
console.log('WECHAT_NOTIFY_MOCK:', process.env.WECHAT_NOTIFY_MOCK);
console.log('WECHAT_NOTIFY_MODE:', process.env.WECHAT_NOTIFY_MODE);

// 加载服务检查
const wechatNotifier = require('../src/utils/wechatNotifier');
const report = wechatNotifier.getCapabilityReport();

console.log('\n=== 微信服务能力报告 ===');
console.log(JSON.stringify(report, null, 2));
