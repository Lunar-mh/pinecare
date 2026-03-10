'use strict';

const { evaluateRecord, collectAlerts } = require('../src/utils/healthAlert');
const { ok, fail } = require('../src/utils/response');

describe('统一响应与健康异常判定回归测试', () => {
  it('response.ok 输出统一格式', () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnValue('ok-result'),
    };

    const ret = ok(res, { a: 1 }, 'ok');

    expect(ret).toBe('ok-result');
    expect(res.json).toHaveBeenCalledWith({ code: 0, message: 'ok', data: { a: 1 } });
  });

  it('response.fail 输出统一格式并带状态码', () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnValue('fail-result'),
    };

    const ret = fail(res, 403, 'forbidden', null, 403);

    expect(ret).toBe('fail-result');
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ code: 403, message: 'forbidden', data: null });
  });

  it('异常阈值命中：血压/心率/血氧/睡眠', () => {
    expect(evaluateRecord({ metricType: 'blood_pressure', valueHigh: 145, valueLow: 95 }).isAlert).toBe(true);
    expect(evaluateRecord({ metricType: 'heart_rate', value: '55' }).isAlert).toBe(true);
    expect(evaluateRecord({ metricType: 'blood_oxygen', value: '93' }).isAlert).toBe(true);
    expect(evaluateRecord({ metricType: 'sleep', value: '3.2' }).isAlert).toBe(true);
  });

  it('collectAlerts 仅返回异常项', () => {
    const alerts = collectAlerts([
      { metricType: 'heart_rate', value: '88' },
      { metricType: 'blood_oxygen', value: '92' },
    ]);

    expect(alerts.length).toBe(1);
    expect(alerts[0].metricType).toBe('blood_oxygen');
  });
});
