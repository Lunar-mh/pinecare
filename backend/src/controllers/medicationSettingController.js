'use strict';

const medicationSettingService = require('../services/medicationSettingService');
const { ok, fail } = require('../utils/response');

function handleError(res, err) {
  const code = typeof err.code === 'number' ? err.code : 500;
  const status = typeof err.statusCode === 'number' ? err.statusCode : 500;
  return fail(res, code, err.message || '用药设置服务暂时不可用，请稍后重试。', err.data || null, status);
}

const medicationSettingController = {
  async getSettings(req, res) {
    try {
      const data = await medicationSettingService.getSettings(req.user.userId);
      return ok(res, data, '用药设置获取成功。');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async updateSettings(req, res) {
    try {
      const data = await medicationSettingService.updateSettings(req.user.userId, req.body || {});
      return ok(res, data, '用药设置更新成功。');
    } catch (err) {
      return handleError(res, err);
    }
  },
};

module.exports = medicationSettingController;