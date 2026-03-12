'use strict';

const neo4j = require('../config/neo4j');
const drugInteractionModel = require('../models/drugInteraction');
const { normalizeDrugPair, normalizeDrugName } = require('../utils/drugDataParser');

const FALLBACK_INTERACTION_MAP = {
  '阿司匹林|华法林': {
    level: 'X',
    mechanism: '双重抗凝与抗血小板作用叠加',
    riskDescription: '出血风险显著升高，严重时可能危及生命。',
    suggestion: '避免自行联用，必须联用时需严密监测凝血指标。',
  },
  '克拉霉素|辛伐他汀': {
    level: 'D',
    mechanism: '代谢酶抑制导致他汀血药浓度升高',
    riskDescription: '肌痛、横纹肌溶解风险上升。',
    suggestion: '优先更换抗生素或暂停他汀，并监测肌酸激酶。',
  },
  '奥美拉唑|氯吡格雷': {
    level: 'C',
    mechanism: 'CYP2C19 代谢竞争',
    riskDescription: '可能降低抗血小板活性。',
    suggestion: '建议改用对 CYP2C19 影响较小的抑酸药。',
  },
};

const CONTRAINDICATION_KB = {
  华法林: [
    {
      diseaseCode: 'D-BLEED-HIGH',
      diseaseName: '活动性出血',
      severity: 'high',
      description: '活动性出血患者禁用华法林，出血风险极高。',
    },
    {
      diseaseCode: 'D-LIVER-SEV',
      diseaseName: '重度肝功能不全',
      severity: 'high',
      description: '重度肝损害会显著增加抗凝不良反应风险。',
    },
  ],
  布洛芬: [
    {
      diseaseCode: 'D-ULCER',
      diseaseName: '消化性溃疡',
      severity: 'high',
      description: '可能诱发或加重胃肠道出血。',
    },
    {
      diseaseCode: 'D-KIDNEY-CKD',
      diseaseName: '慢性肾病',
      severity: 'medium',
      description: '长期使用可能进一步损害肾功能。',
    },
  ],
  二甲双胍: [
    {
      diseaseCode: 'D-KIDNEY-SEV',
      diseaseName: '重度肾功能不全',
      severity: 'high',
      description: '存在乳酸性酸中毒风险，应避免使用。',
    },
  ],
  普萘洛尔: [
    {
      diseaseCode: 'D-ASTHMA',
      diseaseName: '支气管哮喘',
      severity: 'high',
      description: '非选择性β受体阻滞剂可能诱发支气管痉挛。',
    },
  ],
};

function buildFallbackKey(drugA, drugB) {
  const pair = normalizeDrugPair(drugA, drugB);
  const sorted = [pair.drugA, pair.drugB].sort((a, b) =>
    normalizeDrugName(a).localeCompare(normalizeDrugName(b))
  );
  return `${sorted[0]}|${sorted[1]}`;
}

class KnowledgeGraphService {
  constructor() {
    this.neo4jStub = neo4j;
  }

  async checkInteraction(drugA, drugB) {
    const pair = normalizeDrugPair(drugA, drugB);
    const row = await drugInteractionModel.findTopInteractionByPair(pair.drugA, pair.drugB);

    if (row) {
      return {
        level: row.level,
        mechanism: row.mechanism || '已记录于系统知识库',
        riskDescription: row.risk_description || '两药联合使用存在风险，请结合医嘱处理。',
        suggestion: row.suggestion || '建议咨询医生或药师后再联合使用。',
      };
    }

    const fallbackKey = buildFallbackKey(pair.drugA, pair.drugB);
    return FALLBACK_INTERACTION_MAP[fallbackKey] || null;
  }

  async getContraindicationsByDrug(drugName) {
    const target = String(drugName || '').trim();
    if (!target) {
      return [];
    }

    const exact = CONTRAINDICATION_KB[target];
    if (exact) {
      return exact;
    }

    const normalized = normalizeDrugName(target);
    const hitKey = Object.keys(CONTRAINDICATION_KB).find(
      (item) => normalizeDrugName(item) === normalized
    );

    return hitKey ? CONTRAINDICATION_KB[hitKey] : [];
  }
}

module.exports = new KnowledgeGraphService();
