'use strict';

const drugInteractionService = require('../services/drugInteractionService');
const { ok, fail } = require('../utils/response');

function handleError(res, err) {
  const code = err.statusCode || err.code || 500;
  const message = err.message || '系统处理失败，请稍后重试';
  const httpStatus = code >= 100 && code < 600 ? code : 500;
  return fail(res, code, message, null, httpStatus);
}

async function check(req, res) {
  try {
    const { drugList } = req.body || {};
    if (!Array.isArray(drugList)) {
      return fail(res, 422, 'drugList 必须是数组', null, 422);
    }

    const result = await drugInteractionService.checkInteractions(req.user.userId, drugList);

    const message =
      result.interactionCount > 0
        ? `检测完成，发现 ${result.interactionCount} 条风险提示`
        : '检测完成，暂未发现明确风险';

    return ok(res, result.interactions, message);
  } catch (err) {
    return handleError(res, err);
  }
}

async function history(req, res) {
  try {
    const status = req.query.status || '';
    const data = await drugInteractionService.getHistory(req.user.userId, status);
    return ok(res, data, '历史记录查询成功');
  } catch (err) {
    return handleError(res, err);
  }
}

async function acknowledge(req, res) {
  try {
    const { interactionId } = req.body || {};
    if (interactionId === undefined || interactionId === null || interactionId === '') {
      return fail(res, 422, 'interactionId 不能为空', null, 422);
    }

    const data = await drugInteractionService.acknowledgeRisk(req.user.userId, interactionId);
    return ok(res, data, '风险已确认');
  } catch (err) {
    return handleError(res, err);
  }
}

async function contraindication(req, res) {
  try {
    const drugName = req.query.drugName || '';
    if (!String(drugName).trim()) {
      return fail(res, 422, 'drugName 不能为空', null, 422);
    }

    const data = await drugInteractionService.checkContraindication(req.user.userId, drugName);
    return ok(res, data, '禁忌查询完成');
  } catch (err) {
    return handleError(res, err);
  }
}

async function food(req, res) {
  try {
    const drugName = req.query.drugName || '';
    const keyword = req.query.keyword || '';

    if (!String(drugName).trim()) {
      return fail(res, 422, 'drugName 不能为空', null, 422);
    }

    const data = await drugInteractionService.getFoodInteractions(drugName, keyword);
    return ok(res, data, '食物相互作用查询成功');
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  check,
  history,
  acknowledge,
  contraindication,
  food,
};
