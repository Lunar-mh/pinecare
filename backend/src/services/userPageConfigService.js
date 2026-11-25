'use strict';

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.resolve(__dirname, '../../docs');
const PACKAGE_JSON_PATH = path.resolve(__dirname, '../../package.json');
const CACHE_TTL_MS = 5 * 60 * 1000;

const SERVICES_BY_ROLE = Object.freeze({
  elder: [
    {
      key: 'health',
      title: '健康管理',
      description: '核心数据、趋势与用药都在这里。',
      items: [
        { key: 'health', label: '健康档案', description: '血压、心率、趋势', icon: 'heart', path: '/subpackages/health/pages/index/index' },
        { key: 'medication', label: '用药提醒', description: '计划、进度、补服', icon: 'pill', path: '/subpackages/medication/pages/index/index' },
      ],
    },
    {
      key: 'care',
      title: '安全守护',
      description: '风险先看见，紧急情况可立刻处理。',
      items: [
        { key: 'sos', label: '紧急 SOS', description: '长按求助并共享位置', icon: 'sos', path: '/subpackages/sos/pages/index/index', badge: '高优先' },
        { key: 'location', label: '位置共享', description: '同步给家人更安心', icon: 'location', path: '/subpackages/location/pages/index/index' },
      ],
    },
    {
      key: 'service',
      title: '设备与紧急设置',
      description: '绑定监测设备与维护紧急联系人。',
      items: [
        { key: 'device', label: '设备连接', description: '管理手环和血压仪', icon: 'phone', path: '/subpackages/settings/pages/device/index' },
        { key: 'emergency', label: '紧急联系人', description: '随时更新求助家人', icon: 'alert', path: '/subpackages/settings/pages/emergency/index' },
      ],
    },
  ],
  family: [
    {
      key: 'watch',
      title: '监护中心',
      description: '关注长辈状态、告警和位置。',
      items: [
        { key: 'health', label: '健康总览', description: '查看血压、心率和提醒', icon: 'heart', path: '/pages/index/index' },
        { key: 'location', label: '定位追踪', description: '实时位置与地图查看', icon: 'location', path: '/subpackages/location/pages/index/index' },
        { key: 'sos', label: 'SOS 事件', description: '快速处理紧急求助', icon: 'sos', path: '/subpackages/sos/pages/index/index', badge: '告警' },
      ],
    },
    {
      key: 'coordination',
      title: '服务协同',
      description: '联动居家照护与用药安排。',
      items: [
        { key: 'medication', label: '用药进度', description: '查看今日计划与完成度', icon: 'pill', path: '/subpackages/medication/pages/index/index' },
        { key: 'family_manage', label: '家庭管理', description: '管理长辈绑定与协同', icon: 'settings', path: '/pages/family-manage/index' },
      ],
    },
  ],
});

const PROFILE_SECTIONS_BY_ROLE = Object.freeze({
  elder: [
    {
      key: 'device',
      title: '设备与紧急设置',
      items: [
        { key: 'device', label: '设备连接', description: '管理手环和设备状态', icon: 'phone', path: '/subpackages/settings/pages/device/index' },
        { key: 'emergency', label: '紧急联系人', description: '维护求助联系人', icon: 'alert', path: '/subpackages/settings/pages/emergency/index' },
      ],
    },
    {
      key: 'service',
      title: '服务设置',
      items: [
        { key: 'settings', label: '通用设置', description: '声音、通知与偏好', icon: 'settings', path: '/subpackages/settings/pages/index/index' },
        { key: 'feedback', label: '意见反馈', description: '告诉我们哪里还不顺手', icon: 'info', path: '/subpackages/settings/pages/feedback/index' },
        { key: 'about', label: '关于银伴', description: '版本与产品说明', icon: 'info', path: '/subpackages/settings/pages/about/index' },
      ],
    },
  ],
  family: [
    {
      key: 'service',
      title: '守护设置',
      items: [
        { key: 'location', label: '位置共享', description: '查看与管理安全区域', icon: 'location', path: '/subpackages/location/pages/index/index' },
        { key: 'emergency', label: '紧急设置', description: '管理告警和联系人', icon: 'alert', path: '/subpackages/settings/pages/emergency/index' },
        { key: 'settings', label: '通用设置', description: '通知、声音与偏好', icon: 'settings', path: '/subpackages/settings/pages/index/index' },
      ],
    },
    {
      key: 'about',
      title: '支持与关于',
      items: [
        { key: 'feedback', label: '意见反馈', description: '反馈问题与建议', icon: 'info', path: '/subpackages/settings/pages/feedback/index' },
        { key: 'about', label: '关于银伴', description: '版本、协议与产品介绍', icon: 'info', path: '/subpackages/settings/pages/about/index' },
      ],
    },
  ],
});

const SETTINGS_ITEMS = Object.freeze([
  { key: 'device', label: '设备与定位', description: '绑定设备、检查在线状态', icon: 'settings', path: '/subpackages/settings/pages/device/index' },
  { key: 'emergency', label: '紧急联系人', description: '维护 SOS 联系方式', icon: 'alert', path: '/subpackages/settings/pages/emergency/index' },
  { key: 'feedback', label: '帮助反馈', description: '问题反馈与常见帮助', icon: 'info', path: '/subpackages/settings/pages/feedback/index' },
  { key: 'about', label: '关于应用', description: '版本、协议与更新说明', icon: 'heart', path: '/subpackages/settings/pages/about/index' },
]);

let aboutCache = {
  expiresAt: 0,
  value: null,
};

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_error) {
    return '';
  }
}

function extractMeta(markdown) {
  const versionMatch = markdown.match(/Version:\s*([^\r\n]+)/i);
  const effectiveDateMatch = markdown.match(/Effective date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);

  return {
    version: versionMatch ? versionMatch[1].trim() : '',
    effectiveDate: effectiveDateMatch ? effectiveDateMatch[1].trim() : '',
  };
}

function readAppVersion() {
  const raw = readFileSafe(PACKAGE_JSON_PATH);
  if (!raw) return '1.0.0';

  try {
    const pkg = JSON.parse(raw);
    return String(pkg.version || '1.0.0');
  } catch (_error) {
    return '1.0.0';
  }
}

function readAboutConfig() {
  const privacyDoc = readFileSafe(path.join(DOCS_DIR, 'privacy-policy.md'));
  const agreementDoc = readFileSafe(path.join(DOCS_DIR, 'user-agreement.md'));
  const medicalDoc = readFileSafe(path.join(DOCS_DIR, 'medical-disclaimer.md'));
  const aiDoc = readFileSafe(path.join(DOCS_DIR, 'ai-usage-notice.md'));
  const releaseDoc = readFileSafe(path.join(DOCS_DIR, 'four-end-release-candidate.md'));

  const privacyMeta = extractMeta(privacyDoc);
  const agreementMeta = extractMeta(agreementDoc);
  const medicalMeta = extractMeta(medicalDoc);
  const aiMeta = extractMeta(aiDoc);
  const fallbackDate = '2026-03-12';

  const hasReleaseDoc = Boolean(releaseDoc);
  const changelog = hasReleaseDoc
    ? [
        '四端已完成 non-live release candidate 收口，联调基线统一。',
        '后端能力统一了证据链、诊断视图与事件复盘口径。',
        '医疗、定位、SOS、志愿者等关键流程已进入可联调状态。',
      ]
    : [
        '当前构建已进入稳定联调版本。',
        '后端与小程序接口已统一为同一基线。',
        '后续仅保留真实凭据接入与实链路验收。',
      ];

  return {
    appName: '银伴全域智慧照护平台',
    appVersion: readAppVersion(),
    effectiveDate: privacyMeta.effectiveDate || agreementMeta.effectiveDate || fallbackDate,
    summary: '本页面内容来自后端文档与版本清单，前端仅做渲染展示。',
    documents: [
      {
        key: 'privacy',
        title: '隐私政策',
        version: privacyMeta.version || '2026.03-live-defense',
        effectiveDate: privacyMeta.effectiveDate || fallbackDate,
        summary: '说明账号、健康、位置、语音与家庭数据的收集目的、留存周期和删除路径。',
      },
      {
        key: 'agreement',
        title: '用户协议',
        version: agreementMeta.version || '2026.03-live-defense',
        effectiveDate: agreementMeta.effectiveDate || fallbackDate,
        summary: '明确长辈、家属、社区与志愿者在平台中的使用责任、边界和申诉路径。',
      },
      {
        key: 'medical',
        title: '医疗免责声明',
        version: medicalMeta.version || '2026.03-live-defense',
        effectiveDate: medicalMeta.effectiveDate || fallbackDate,
        summary: '医疗目录、预约、问诊和报告能力用于协同与信息获取，不替代临床诊断。',
      },
      {
        key: 'ai',
        title: 'AI 使用说明',
        version: aiMeta.version || '2026.03-live-defense',
        effectiveDate: aiMeta.effectiveDate || fallbackDate,
        summary: 'AI 咨询、语音与伴聊能力需明确 live/stub 模式并提供人工兜底。',
      },
    ],
    changelog,
  };
}

function getAboutConfig() {
  const now = Date.now();
  if (aboutCache.value && aboutCache.expiresAt > now) {
    return aboutCache.value;
  }

  const config = readAboutConfig();
  aboutCache = {
    value: config,
    expiresAt: now + CACHE_TTL_MS,
  };
  return config;
}

function calculateProfileCompletion(profile) {
  let total = 0;
  let filled = 0;
  const fields = ['phone', 'nickname', 'real_name', 'gender', 'age'];

  fields.forEach((field) => {
    total += 1;
    const value = profile ? profile[field] : null;
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      filled += 1;
    }
  });

  return total === 0 ? 0 : Math.round((filled / total) * 100);
}

function buildUserPageConfig({ profile, emergencyContactCount }) {
  const about = getAboutConfig();
  const settingsItems = SETTINGS_ITEMS.map((item) => {
    if (item.key === 'emergency') {
      return {
        ...item,
        badge: `${Number(emergencyContactCount || 0)} 人`,
      };
    }
    return item;
  });

  return {
    servicesByRole: SERVICES_BY_ROLE,
    profileSectionsByRole: PROFILE_SECTIONS_BY_ROLE,
    settingsItems,
    about,
    profileMeta: {
      completion: calculateProfileCompletion(profile),
      appVersion: about.appVersion,
    },
  };
}

module.exports = {
  buildUserPageConfig,
};
