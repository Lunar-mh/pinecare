'use strict';

const VALID_SENSITIVITY = ['high', 'medium', 'low'];
const THRESHOLDS = {
  high: { vertical: 2.5, horizontal: 1.5 },
  medium: { vertical: 3.0, horizontal: 2.0 },
  low: { vertical: 4.0, horizontal: 2.5 },
};

function createBizError(code, message, status) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = status || code;
  return err;
}

function normalizeSensorData(sensorData) {
  const data = sensorData || {};

  const directVertical = Number(
    data.verticalPeak !== undefined ? data.verticalPeak : data.vertical_peak
  );
  const directHorizontal = Number(
    data.horizontalChangeRate !== undefined ? data.horizontalChangeRate : data.horizontal_change_rate
  );

  if (Number.isFinite(directVertical) && Number.isFinite(directHorizontal)) {
    return {
      verticalPeak: Math.abs(directVertical),
      horizontalChangeRate: Math.abs(directHorizontal),
    };
  }

  const xArr = Array.isArray(data.x) ? data.x : [];
  const yArr = Array.isArray(data.y) ? data.y : [];
  const zArr = Array.isArray(data.z) ? data.z : Array.isArray(data.az) ? data.az : [];
  const tArr = Array.isArray(data.timestamps) ? data.timestamps : [];

  const samples = Array.isArray(data.samples) ? data.samples : [];
  const sampleX = samples.map((sample) => Number(sample.x || sample.ax || 0));
  const sampleY = samples.map((sample) => Number(sample.y || sample.ay || 0));
  const sampleZ = samples.map((sample) => Number(sample.z || sample.az || 0));
  const sampleT = samples.map((sample) => Number(sample.ts || sample.timestamp || 0));

  const finalX = xArr.length > 0 ? xArr.map(Number) : sampleX;
  const finalY = yArr.length > 0 ? yArr.map(Number) : sampleY;
  const finalZ = zArr.length > 0 ? zArr.map(Number) : sampleZ;
  const finalT = tArr.length > 0 ? tArr.map(Number) : sampleT;

  const verticalPeak = finalZ.reduce((max, value) => {
    const normalizedValue = Number.isFinite(value) ? Math.abs(value) : 0;
    return normalizedValue > max ? normalizedValue : max;
  }, 0);

  let horizontalChangeRate = 0;
  if (finalX.length > 1 && finalY.length > 1) {
    for (let index = 1; index < Math.min(finalX.length, finalY.length); index += 1) {
      const prev = Math.sqrt(Math.pow(finalX[index - 1] || 0, 2) + Math.pow(finalY[index - 1] || 0, 2));
      const curr = Math.sqrt(Math.pow(finalX[index] || 0, 2) + Math.pow(finalY[index] || 0, 2));
      const delta = Math.abs(curr - prev);

      let deltaSec = 1;
      if (finalT[index] && finalT[index - 1] && finalT[index] > finalT[index - 1]) {
        deltaSec = (finalT[index] - finalT[index - 1]) / 1000;
      }

      const rate = deltaSec > 0 ? delta / deltaSec : delta;
      if (rate > horizontalChangeRate) {
        horizontalChangeRate = rate;
      }
    }
  }

  return {
    verticalPeak,
    horizontalChangeRate,
  };
}

function ensureSensitivity(sensitivity) {
  const normalized = String(sensitivity || 'medium').toLowerCase();
  if (!VALID_SENSITIVITY.includes(normalized)) {
    throw createBizError(400, 'sensitivity only supports high/medium/low.', 400);
  }
  return normalized;
}

function timerKey(eventId) {
  return `fall:timer:${eventId}`;
}

function settingsKey(userId) {
  return `fall:settings:${userId}`;
}

module.exports = {
  THRESHOLDS,
  VALID_SENSITIVITY,
  createBizError,
  ensureSensitivity,
  normalizeSensorData,
  settingsKey,
  timerKey,
};
