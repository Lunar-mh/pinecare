'use strict';

const medicationSettingService = require('../services/medicationSettingService');
const { ok, fail } = require('../utils/response');

function handleError(res, err) {
  const code = typeof err.code === 'number' ? err.code : 500;
  const status = typeof err.statusCode === 'number' ? err.statusCode : 500;
  return fail(res, code, err.message || '服务器内部错误', err.data || null, status);
}

const medicationSettingController = {
  async getSettings(req, res) {
    try {
      const data = await medicationSettingService.getSettings(req.user.userId);
      return ok(res, data, '获取提醒设置成功');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async updateSettings(req, res) {
    try {
      const data = await medicationSettingService.updateSettings(req.user.userId, req.body || {});
      return ok(res, data, '更新提醒设置成功');
    } catch (err) {
      return handleError(res, err);
    }
  },
};

module.exports = medicationSettingController;
