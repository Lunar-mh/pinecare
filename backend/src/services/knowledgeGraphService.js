'use strict';

const neo4j = require('../config/neo4j');
const drugInteractionModel = require('../models/drugInteraction');
const { normalizeDrugPair, normalizeDrugName } = require('../utils/drugDataParser');

const DRUG_NAMES = {
  aspirin: '\u963f\u53f8\u5339\u6797',
  warfarin: '\u534e\u6cd5\u6797',
  clarithromycin: '\u514b\u62c9\u9709\u7d20',
  simvastatin: '\u8f9b\u4f10\u4ed6\u6c40',
  omeprazole: '\u5965\u7f8e\u62c9\u5511',
  clopidogrel: '\u6c2f\u5421\u683c\u96f7',
  ibuprofen: '\u5e03\u6d1b\u82ac',
  metformin: '\u4e8c\u7532\u53cc\u80cd',
  propranolol: '\u666e\u843d\u6d1b\u5c14',
};

const FALLBACK_INTERACTION_MAP = {
  [`${DRUG_NAMES.aspirin}|${DRUG_NAMES.warfarin}`]: {
    level: 'X',
    mechanism: 'Dual anticoagulant and antiplatelet effects overlap.',
    riskDescription: 'Bleeding risk rises significantly and may become life-threatening.',
    suggestion: 'Avoid combining these drugs without physician supervision and coagulation monitoring.',
  },
  [`${DRUG_NAMES.clarithromycin}|${DRUG_NAMES.simvastatin}`]: {
    level: 'D',
    mechanism: 'Metabolic enzyme inhibition increases statin exposure.',
    riskDescription: 'Myalgia and rhabdomyolysis risk increases.',
    suggestion: 'Prefer an alternative antibiotic or pause the statin with CK monitoring.',
  },
  [`${DRUG_NAMES.omeprazole}|${DRUG_NAMES.clopidogrel}`]: {
    level: 'C',
    mechanism: 'CYP2C19 metabolic competition.',
    riskDescription: 'Antiplatelet activity may be reduced.',
    suggestion: 'Use an acid suppression option with lower CYP2C19 interaction risk.',
  },
};

const CONTRAINDICATION_KB = {
  [DRUG_NAMES.warfarin]: [
    {
      diseaseCode: 'D-BLEED-HIGH',
      diseaseName: 'active_bleeding',
      severity: 'high',
      description: 'Active bleeding is a contraindication because anticoagulation risk is extreme.',
    },
    {
      diseaseCode: 'D-LIVER-SEV',
      diseaseName: 'severe_liver_impairment',
      severity: 'high',
      description: 'Severe hepatic impairment can markedly increase anticoagulation complications.',
    },
  ],
  [DRUG_NAMES.ibuprofen]: [
    {
      diseaseCode: 'D-ULCER',
      diseaseName: 'peptic_ulcer',
      severity: 'high',
      description: 'May trigger or worsen gastrointestinal bleeding.',
    },
    {
      diseaseCode: 'D-KIDNEY-CKD',
      diseaseName: 'chronic_kidney_disease',
      severity: 'medium',
      description: 'Long-term use may further impair renal function.',
    },
  ],
  [DRUG_NAMES.metformin]: [
    {
      diseaseCode: 'D-KIDNEY-SEV',
      diseaseName: 'severe_kidney_impairment',
      severity: 'high',
      description: 'Use should be avoided because of lactic acidosis risk.',
    },
  ],
  [DRUG_NAMES.propranolol]: [
    {
      diseaseCode: 'D-ASTHMA',
      diseaseName: 'asthma',
      severity: 'high',
      description: 'Non-selective beta blockade may provoke bronchospasm.',
    },
  ],
};

function buildFallbackKey(drugA, drugB) {
  const pair = normalizeDrugPair(drugA, drugB);
  const sorted = [pair.drugA, pair.drugB].sort((left, right) =>
    normalizeDrugName(left).localeCompare(normalizeDrugName(right))
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
        mechanism: row.mechanism || 'Recorded in the local interaction knowledge base.',
        riskDescription:
          row.risk_description ||
          'The combination carries medication risk and should be reviewed with a clinician.',
        suggestion:
          row.suggestion || 'Consult a physician or pharmacist before combining these drugs.',
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
