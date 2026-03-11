'use strict';

require('dotenv').config();

const { getCapabilityReport: getSmsCapabilityReport } = require('../src/services/sosSmsDirectService');
const { getCapabilityReport: getWechatCapabilityReport } = require('../src/services/sosWechatDirectService');

function truncateText(value, length = 20) {
  return String(value || '').trim().slice(0, length);
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    i += 1;
  }
  return options;
}

function buildSamplePayload(options) {
  return {
    event_id: options.eventId || 'SOS-DEMO-001',
    phone: options.phone || '13800000000',
    open_id: options.openId || 'openid-demo-family-001',
    contact_name: options.contactName || '家属张女士',
    address: options.address || '陕西省延安市宝塔区枣园路社区',
    latitude: options.latitude || '36.5852',
    longitude: options.longitude || '109.4897',
    triggered_at: options.triggeredAt || '2026-03-11 20:30:00',
  };
}

function buildSmsPreview(payload) {
  return {
    provider: 'aliyun_sms',
    signName: String(process.env.SOS_SMS_SIGN_NAME || process.env.ALIYUN_SMS_SIGN_NAME || '').trim(),
    templateCode: String(process.env.SOS_SMS_TEMPLATE_CODE || process.env.ALIYUN_SMS_TEMPLATE_CODE || '').trim(),
    phoneNumbers: String(payload.phone || '').trim(),
    templateParam: {
      event_id: String(payload.event_id || ''),
      contact_name: String(payload.contact_name || ''),
      address: String(payload.address || 'unknown address'),
      latitude: payload.latitude === undefined || payload.latitude === null ? '' : String(payload.latitude),
      longitude: payload.longitude === undefined || payload.longitude === null ? '' : String(payload.longitude),
      triggered_at: String(payload.triggered_at || ''),
    },
  };
}

function buildWechatPreview(payload) {
  const fieldContact = String(process.env.SOS_WX_FIELD_CONTACT || 'thing1').trim();
  const fieldAddress = String(process.env.SOS_WX_FIELD_ADDRESS || 'thing2').trim();
  const fieldTime = String(process.env.SOS_WX_FIELD_TIME || 'time3').trim();
  const fieldCoords = String(process.env.SOS_WX_FIELD_COORDS || 'thing4').trim();

  return {
    provider: 'wechat_subscribe_message',
    templateId: String(process.env.SOS_WX_MSG_TEMPLATE_ID || process.env.WX_MSG_TEMPLATE_ID_FAMILY || process.env.WX_MSG_TEMPLATE_ID || '').trim(),
    page: String(process.env.SOS_WECHAT_PAGE || 'pages/sos/index').trim(),
    touser: String(payload.open_id || payload.openId || '').trim(),
    miniprogram_state: process.env.WECHAT_MINI_PROGRAM_STATE || 'formal',
    lang: 'zh_CN',
    data: {
      [fieldContact]: { value: truncateText(payload.contact_name || 'Emergency contact') },
      [fieldAddress]: { value: truncateText(payload.address || 'unknown address') },
      [fieldTime]: { value: truncateText(payload.triggered_at || new Date().toISOString(), 32) },
      [fieldCoords]: { value: truncateText(`${payload.latitude || '-'},${payload.longitude || '-'}`, 32) },
    },
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const payload = buildSamplePayload(options);

  const report = {
    generatedAt: new Date().toISOString(),
    samplePayload: payload,
    sms: {
      capability: getSmsCapabilityReport(),
      preview: buildSmsPreview(payload),
    },
    wechat: {
      capability: getWechatCapabilityReport(),
      preview: buildWechatPreview(payload),
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main();
}
