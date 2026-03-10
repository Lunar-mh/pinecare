'use strict';

/**
 * 健康异常阈值规则
 */
const THRESHOLDS = {
  bloodPressure: { systolic: 140, diastolic: 90 },
  heartRate: { min: 60, max: 100 },
  bloodOxygen: { min: 95 },
  sleepHours: { min: 4 },
};

/**
 * 将任意输入转为数字
 * @param {any} value
 * @returns {number|null}
 */
function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * 解析血压值（优先使用 value_high/value_low）
 * @param {string} value
 * @param {number|null} valueHigh
 * @param {number|null} valueLow
 * @returns {{systolic:number|null,diastolic:number|null}}
 */
function parseBloodPressure(value, valueHigh, valueLow) {
  const systolic = toNumber(valueHigh);
  const diastolic = toNumber(valueLow);

  if (systolic !== null && diastolic !== null) {
    return { systolic, diastolic };
  }

  const text = String(value || '').trim();
  const match = text.match(/(\d{2,3})\s*[\/-]\s*(\d{2,3})/);
  if (!match) {
    return { systolic: systolic || null, diastolic: diastolic || null };
  }

  return {
    systolic: toNumber(match[1]),
    diastolic: toNumber(match[2]),
  };
}

/**
 * 判断单条健康记录是否异常
 * @param {object} record
 * @returns {{isAlert:boolean,reasons:string[]}}
 */
function evaluateRecord(record) {
  const metricType = String(record.metricType || record.metric_type || '');
  const value = record.value;
  const valueHigh = record.valueHigh !== undefined ? record.valueHigh : record.value_high;
  const valueLow = record.valueLow !== undefined ? record.valueLow : record.value_low;

  const reasons = [];

  if (metricType === 'blood_pressure') {
    const { systolic, diastolic } = parseBloodPressure(value, valueHigh, valueLow);
    if (
      (systolic !== null && systolic >= THRESHOLDS.bloodPressure.systolic) ||
      (diastolic !== null && diastolic >= THRESHOLDS.bloodPressure.diastolic)
    ) {
      reasons.push('血压偏高');
    }
  }

  if (metricType === 'heart_rate') {
    const heartRate = toNumber(value);
    if (
      heartRate !== null &&
      (heartRate < THRESHOLDS.heartRate.min || heartRate > THRESHOLDS.heartRate.max)
    ) {
      reasons.push('心率异常');
    }
  }

  if (metricType === 'blood_oxygen') {
    const bloodOxygen = toNumber(value);
    if (bloodOxygen !== null && bloodOxygen < THRESHOLDS.bloodOxygen.min) {
      reasons.push('血氧偏低');
    }
  }

  if (metricType === 'sleep') {
    const sleepHours = toNumber(value);
    if (sleepHours !== null && sleepHours < THRESHOLDS.sleepHours.min) {
      reasons.push('睡眠时长不足');
    }
  }

  return {
    isAlert: reasons.length > 0,
    reasons,
  };
}

/**
 * 从记录列表中提取异常项
 * @param {object[]} records
 * @returns {object[]}
 */
function collectAlerts(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return [];
  }

  return records
    .map((record) => {
      const result = evaluateRecord(record);
      if (!result.isAlert) {
        return null;
      }

      return {
        metricType: record.metricType || record.metric_type,
        value: record.value,
        valueHigh: record.valueHigh !== undefined ? record.valueHigh : record.value_high,
        valueLow: record.valueLow !== undefined ? record.valueLow : record.value_low,
        measuredAt: record.measuredAt || record.measured_at || null,
        reasons: result.reasons,
      };
    })
    .filter(Boolean);
}

module.exports = {
  THRESHOLDS,
  evaluateRecord,
  collectAlerts,
};
