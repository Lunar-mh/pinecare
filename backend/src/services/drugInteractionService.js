'use strict';

const { query } = require('../config/database');
const drugInteractionModel = require('../models/drugInteraction');
const knowledgeGraphService = require('./knowledgeGraphService');
const {
  RISK_WEIGHT,
  normalizeDrugName,
  normalizeDrugList,
  normalizeDrugPair,
  sortByRiskLevel,
} = require('../utils/drugDataParser');

const CHECK_CONCURRENCY = 8;
const QUERY_TIMEOUT_MS = 400;

function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

function createBatchId() {
  return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timer = null;

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(timeoutMessage);
      err.code = 'QUERY_TIMEOUT';
      reject(err);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function runWithConcurrency(taskFactories, maxConcurrency) {
  const result = new Array(taskFactories.length);
  let cursor = 0;

  async function worker() {
    while (cursor < taskFactories.length) {
      const index = cursor;
      cursor += 1;
      result[index] = await taskFactories[index]();
    }
  }

  const workers = Array.from({ length: Math.max(1, maxConcurrency) }, () => worker());
  await Promise.all(workers);
  return result;
}

function formatInteractionRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    drugA: row.drug_a,
    drugB: row.drug_b,
    level: row.level,
    mechanism: row.mechanism,
    riskDescription: row.risk_description,
    suggestion: row.suggestion,
    status: row.status,
    checkBatchId: row.check_batch_id,
    createdAt: row.created_at,
  };
}

function normalizeDiseaseList(rawValue) {
  if (!rawValue) return [];

  const parsed = typeof rawValue === 'string' ? safeParseJSON(rawValue) : rawValue;
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => {
      if (typeof item === 'string') {
        const name = item.trim();
        return name ? { code: '', name } : null;
      }

      if (!item || typeof item !== 'object') return null;

      const code = String(item.code || item.diseaseCode || '').trim();
      const name = String(item.name || item.diseaseName || '').trim();

      if (!code && !name) return null;
      return { code, name };
    })
    .filter(Boolean);
}

function safeParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

class DrugInteractionService {
  /**
   * 检测并落库药物相互作用
   * @param {number} userId
   * @param {Array<string>} drugList
   * @returns {Promise<object>}
   */
  async checkInteractions(userId, drugList) {
    const normalizedList = normalizeDrugList(drugList);
    const checkBatchId = createBatchId();
    const pairList = [];

    for (let i = 0; i < normalizedList.length; i += 1) {
      for (let j = i + 1; j < normalizedList.length; j += 1) {
        pairList.push(normalizeDrugPair(normalizedList[i], normalizedList[j]));
      }
    }

    const taskFactories = pairList.map((pair) => async () => {
      try {
        const interaction = await withTimeout(
          knowledgeGraphService.checkInteraction(pair.drugA, pair.drugB),
          QUERY_TIMEOUT_MS,
          `查询 ${pair.drugA} 与 ${pair.drugB} 超时`
        );

        if (!interaction) {
          return null;
        }

        return {
          drugA: pair.drugA,
          drugB: pair.drugB,
          level: interaction.level,
          mechanism: interaction.mechanism,
          riskDescription: interaction.riskDescription,
          suggestion: interaction.suggestion,
          status: 'pending',
        };
      } catch (err) {
        return {
          degraded: true,
          drugA: pair.drugA,
          drugB: pair.drugB,
          reason: err.message || '查询失败',
        };
      }
    });

    const rawResults = await runWithConcurrency(taskFactories, Math.min(CHECK_CONCURRENCY, pairList.length));

    const degradedPairs = rawResults.filter((item) => item && item.degraded);
    const interactions = rawResults.filter((item) => item && !item.degraded);

    const sortedInteractions = sortByRiskLevel(interactions);
    const savedRows = await drugInteractionModel.batchInsertInteractions(
      userId,
      sortedInteractions,
      checkBatchId
    );

    const dataList = savedRows.map(formatInteractionRow);

    const highestRiskLevel = dataList.reduce((current, item) => {
      if (!current) return item.level;
      return (RISK_WEIGHT[item.level] || 0) > (RISK_WEIGHT[current] || 0) ? item.level : current;
    }, null);

    return {
      checkBatchId,
      highestRiskLevel,
      totalPairs: pairList.length,
      interactionCount: dataList.length,
      degradedCount: degradedPairs.length,
      degradedPairs,
      interactions: dataList,
    };
  }

  /**
   * 获取历史检测记录
   * @param {number} userId
   * @param {string} status
   * @returns {Promise<Array<object>>}
   */
  async getHistory(userId, status) {
    const statusValue = status ? String(status).trim() : '';
    if (statusValue && !['pending', 'acknowledged'].includes(statusValue)) {
      throw createBizError(422, 'status 仅支持 pending 或 acknowledged', 422);
    }

    const rows = await drugInteractionModel.listHistoryByUser(userId, statusValue || null);
    return rows.map(formatInteractionRow);
  }

  /**
   * 确认风险
   * @param {number} userId
   * @param {number|string} interactionId
   * @returns {Promise<object>}
   */
  async acknowledgeRisk(userId, interactionId) {
    const interactionIdNum = Number(interactionId);
    if (!interactionIdNum || Number.isNaN(interactionIdNum)) {
      throw createBizError(422, 'interactionId 必须是有效数字', 422);
    }

    const row = await drugInteractionModel.findInteractionById(interactionIdNum);

    if (!row) {
      throw createBizError(404, '风险记录不存在', 404);
    }

    if (Number(row.user_id) !== Number(userId)) {
      throw createBizError(403, '无权确认该风险记录', 403);
    }

    if (row.status === 'acknowledged') {
      return formatInteractionRow(row);
    }

    await drugInteractionModel.updateInteractionStatus(interactionIdNum, 'acknowledged');

    const updated = await drugInteractionModel.findInteractionById(interactionIdNum);
    return formatInteractionRow(updated);
  }

  /**
   * 检测药物禁忌
   * @param {number} userId
   * @param {string} drugName
   * @returns {Promise<Array<object>>}
   */
  async checkContraindication(userId, drugName) {
    const targetDrug = String(drugName || '').trim();
    if (!targetDrug) {
      throw createBizError(422, 'drugName 不能为空', 422);
    }

    const [userRows] = await query(
      `SELECT chronic_diseases
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    const diseases = normalizeDiseaseList(userRows[0] && userRows[0].chronic_diseases);
    if (diseases.length === 0) {
      return [];
    }

    const candidates = await knowledgeGraphService.getContraindicationsByDrug(targetDrug);
    if (candidates.length === 0) {
      return [];
    }

    const matched = candidates.filter((item) => {
      return diseases.some((disease) => {
        const codeMatched =
          disease.code && item.diseaseCode && normalizeDrugName(disease.code) === normalizeDrugName(item.diseaseCode);
        const nameMatched =
          disease.name && item.diseaseName && normalizeDrugName(disease.name) === normalizeDrugName(item.diseaseName);
        return codeMatched || nameMatched;
      });
    });

    if (matched.length === 0) {
      return [];
    }

    await drugInteractionModel.batchInsertContraindications(userId, targetDrug, matched);

    return matched.map((item) => ({
      drugName: targetDrug,
      diseaseCode: item.diseaseCode,
      diseaseName: item.diseaseName,
      severity: item.severity,
      description: item.description,
    }));
  }

  /**
   * 查询药物与食物相互作用
   * @param {string} drugName
   * @param {string} keyword
   * @returns {Promise<Array<object>>}
   */
  async getFoodInteractions(drugName, keyword) {
    const targetDrug = String(drugName || '').trim();
    if (!targetDrug) {
      throw createBizError(422, 'drugName 不能为空', 422);
    }

    const rows = await drugInteractionModel.listFoodInteractions(targetDrug, keyword || null);

    return rows.map((row) => ({
      id: row.id,
      drugName: row.drug_name,
      foodName: row.food_name,
      interactionType: row.interaction_type,
      description: row.description,
      suggestion: row.suggestion,
    }));
  }
}

module.exports = new DrugInteractionService();
