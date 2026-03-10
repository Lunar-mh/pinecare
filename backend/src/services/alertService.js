'use strict';

const fenceAlertModel = require('../models/fenceAlertModel');

const alertService = {
  /**
   * 查询告警列表（默认按时间倒序）
   * @param {number} userId
   * @param {{isHandled?:string|boolean|number}} params
   * @returns {Promise<object[]>}
   */
  async listAlerts(userId, params) {
    let isHandled = null;

    if (params && Object.prototype.hasOwnProperty.call(params, 'isHandled')) {
      const value = params.isHandled;
      if (value === true || value === 'true' || value === 1 || value === '1') {
        isHandled = true;
      } else if (value === false || value === 'false' || value === 0 || value === '0') {
        isHandled = false;
      }
    }

    return fenceAlertModel.listByUserId(userId, isHandled);
  },
};

module.exports = alertService;
