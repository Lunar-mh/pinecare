'use strict';

const healthRecordModel = require('../models/healthRecordModel');
const { collectAlerts } = require('../utils/healthAlert');
const { createBizError } = require('../utils/serviceError');

const VALID_METRIC_TYPES = [
  'blood_pressure',
  'heart_rate',
  'blood_oxygen',
  'steps',
  'sleep',
  'blood_sugar',
  'temperature',
];

const VALID_PERIODS = ['7d', '30d'];


function ensureMetricType(metricType) {
  if (!VALID_METRIC_TYPES.includes(metricType)) {
    throw createBizError(400, 'metric_type invalid', 400);
  }
}

function ensurePeriod(period) {
  if (!VALID_PERIODS.includes(period)) {
    throw createBizError(400, 'period must be 7d or 30d', 400);
  }
}

function pickLatestByMetric(records) {
  return records.reduce((acc, item) => {
    if (!acc[item.metricType]) {
      acc[item.metricType] = item;
    }
    return acc;
  }, {});
}

const healthArchiveService = {
  VALID_METRIC_TYPES,
  VALID_PERIODS,

  async getToday(userId) {
    const records = await healthRecordModel.getTodayRecords(userId);
    const latestMetrics = pickLatestByMetric(records);
    const latestRecords = Object.values(latestMetrics);

    return {
      userId,
      date: new Date().toISOString().slice(0, 10),
      metrics: latestMetrics,
      alerts: collectAlerts(latestRecords),
      recordsCount: records.length,
    };
  },

  async getTrend(userId, metricType, period) {
    ensureMetricType(metricType);
    ensurePeriod(period);

    const list = await healthRecordModel.getTrendData(userId, metricType, period);

    return {
      userId,
      metricType,
      period,
      list,
      alerts: collectAlerts(list),
    };
  },

  async getLatestBloodPressure(userId) {
    const record = await healthRecordModel.getLatestByMetricType(userId, 'blood_pressure');
    if (!record) return null;
    return {
      id: String(record.id),
      systolic: record.valueHigh != null ? record.valueHigh : 0,
      diastolic: record.valueLow != null ? record.valueLow : 0,
      measuredAt: record.measuredAt,
      status: record.valueHigh > 140 || record.valueLow > 90 ? 'warning' : 'normal',
    };
  },

  async getLatestHeartRate(userId) {
    const record = await healthRecordModel.getLatestByMetricType(userId, 'heart_rate');
    if (!record) return null;
    const val = Number(record.value);
    return {
      id: String(record.id),
      value: val,
      measuredAt: record.measuredAt,
      status: val < 60 || val > 100 ? 'warning' : 'normal',
    };
  },
};

module.exports = healthArchiveService;
