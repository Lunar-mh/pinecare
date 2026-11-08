'use strict';

const deviceService = require('../services/deviceService');
const { ok } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');

const deviceController = {
  /**
   * @description 绑定监测硬件设备（血压计、手环、血氧仪等）
   * @param {import('express').Request} req HTTP 请求对象，需提供 device_name, device_mac, device_type
   * @param {import('express').Response} res HTTP 响应对象
   * @returns {Promise<void>} 绑定结果
   */
  async bind(req, res) {
    try {
      const data = await deviceService.bind(req.user.userId, req.body || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return sendControllerError(res, err);
    }
  },

  /**
   * @description 解绑监测硬件设备
   * @param {import('express').Request} req HTTP 请求对象，需提供 device_id
   * @param {import('express').Response} res HTTP 响应对象
   * @returns {Promise<void>} 解绑成功状态
   */
  async unbind(req, res) {
    try {
      const data = await deviceService.unbind(req.user.userId, req.body || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return sendControllerError(res, err);
    }
  },

  /**
   * @description 查询当前用户已绑定的监测硬件设备列表
   * @param {import('express').Request} req HTTP 请求对象
   * @param {import('express').Response} res HTTP 响应对象
   * @returns {Promise<void>} 设备列表（包含主设备标记、电量与最后同步时间）
   */
  async list(req, res) {
    try {
      const data = await deviceService.list(req.user.userId);
      return ok(res, data, 'ok');
    } catch (err) {
      return sendControllerError(res, err);
    }
  },

  /**
   * @description 设置指定设备为首选主测量设备
   * @param {import('express').Request} req HTTP 请求对象，需提供 device_id
   * @param {import('express').Response} res HTTP 响应对象
   * @returns {Promise<void>}
   */
  async setPrimary(req, res) {
    try {
      const data = await deviceService.setPrimary(req.user.userId, req.body || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return sendControllerError(res, err);
    }
  },
};

module.exports = deviceController;
